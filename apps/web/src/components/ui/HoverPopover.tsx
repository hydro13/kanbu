/*
 * HoverPopover Component
 * Version: 1.1.0
 *
 * Universal hover popover component with smart positioning.
 * Can be used anywhere in the app for hover-triggered content.
 * Includes delay on close to allow mouse to move to popover.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: Opus 4.5
 * Host: linux-dev
 * Signed: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// =============================================================================
// Types
// =============================================================================

type PopoverPosition = 'top' | 'bottom' | 'left' | 'right' | 'auto'

interface HoverPopoverProps {
  /** The trigger element that shows popover on hover */
  children: ReactNode
  /** The content to show in the popover */
  content: ReactNode
  /** Preferred position (default: auto) */
  position?: PopoverPosition
  /** Delay before showing popover in ms (default: 200) */
  delay?: number
  /** Delay before hiding popover in ms (default: 150) - allows mouse to reach popover */
  closeDelay?: number
  /** Custom width for popover */
  width?: number | string
  /** Maximum height before scrolling */
  maxHeight?: number
  /** Whether popover is disabled */
  disabled?: boolean
  /** Custom className for the popover container */
  popoverClassName?: string
  /** Offset from trigger in pixels */
  offset?: number
}

// =============================================================================
// HoverPopover Component
// =============================================================================

export function HoverPopover({
  children,
  content,
  position = 'auto',
  delay = 200,
  closeDelay = 150,
  width = 320,
  maxHeight = 400,
  disabled = false,
  popoverClassName = '',
  offset = 8,
}: HoverPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const [actualPosition, setActualPosition] = useState<PopoverPosition>(position)
  const triggerRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const openTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isHoveringPopover = useRef(false)
  const isHoveringTrigger = useRef(false)

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current) return null

    const rect = triggerRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const popoverWidth = typeof width === 'number' ? width : 320
    const popoverEstimatedHeight = maxHeight

    // Calculate available space in each direction
    const spaceAbove = rect.top
    const spaceBelow = viewportHeight - rect.bottom
    const spaceLeft = rect.left
    const spaceRight = viewportWidth - rect.right

    // Determine best position
    let bestPosition = position
    if (position === 'auto') {
      // Prefer bottom, then right, then top, then left
      if (spaceBelow >= popoverEstimatedHeight || spaceBelow >= spaceAbove) {
        bestPosition = 'bottom'
      } else if (spaceRight >= popoverWidth) {
        bestPosition = 'right'
      } else if (spaceAbove >= popoverEstimatedHeight) {
        bestPosition = 'top'
      } else if (spaceLeft >= popoverWidth) {
        bestPosition = 'left'
      } else {
        bestPosition = 'bottom' // fallback
      }
    }

    setActualPosition(bestPosition)

    let top = 0
    let left = 0

    switch (bestPosition) {
      case 'top':
        top = rect.top + window.scrollY - offset
        left = rect.left + window.scrollX + rect.width / 2 - popoverWidth / 2
        break
      case 'bottom':
        top = rect.bottom + window.scrollY + offset
        left = rect.left + window.scrollX + rect.width / 2 - popoverWidth / 2
        break
      case 'left':
        top = rect.top + window.scrollY + rect.height / 2
        left = rect.left + window.scrollX - popoverWidth - offset
        break
      case 'right':
        top = rect.top + window.scrollY + rect.height / 2
        left = rect.right + window.scrollX + offset
        break
    }

    // Clamp to viewport
    left = Math.max(8, Math.min(left, viewportWidth - popoverWidth - 8))
    top = Math.max(8, top)

    return { top, left }
  }, [position, width, maxHeight, offset])

  const clearAllTimeouts = useCallback(() => {
    if (openTimeout.current) {
      clearTimeout(openTimeout.current)
      openTimeout.current = null
    }
    if (closeTimeout.current) {
      clearTimeout(closeTimeout.current)
      closeTimeout.current = null
    }
  }, [])

  const scheduleOpen = useCallback(() => {
    clearAllTimeouts()
    openTimeout.current = setTimeout(() => {
      const pos = calculatePosition()
      if (pos) {
        setCoords(pos)
        setIsOpen(true)
      }
    }, delay)
  }, [delay, calculatePosition, clearAllTimeouts])

  const scheduleClose = useCallback(() => {
    // Don't close if hovering either trigger or popover
    if (isHoveringTrigger.current || isHoveringPopover.current) return

    clearAllTimeouts()
    closeTimeout.current = setTimeout(() => {
      // Double-check before closing
      if (!isHoveringTrigger.current && !isHoveringPopover.current) {
        setIsOpen(false)
      }
    }, closeDelay)
  }, [closeDelay, clearAllTimeouts])

  const handleTriggerEnter = useCallback(() => {
    if (disabled) return
    isHoveringTrigger.current = true
    scheduleOpen()
  }, [disabled, scheduleOpen])

  const handleTriggerLeave = useCallback(() => {
    isHoveringTrigger.current = false
    scheduleClose()
  }, [scheduleClose])

  const handlePopoverEnter = useCallback(() => {
    isHoveringPopover.current = true
    clearAllTimeouts()
  }, [clearAllTimeouts])

  const handlePopoverLeave = useCallback(() => {
    isHoveringPopover.current = false
    scheduleClose()
  }, [scheduleClose])

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts()
    }
  }, [clearAllTimeouts])

  // Adjust position if popover goes off-screen after rendering
  useEffect(() => {
    if (isOpen && popoverRef.current && coords) {
      const rect = popoverRef.current.getBoundingClientRect()
      const viewportHeight = window.innerHeight
      const viewportWidth = window.innerWidth

      let newTop = coords.top
      let newLeft = coords.left

      // Adjust if overflowing bottom
      if (rect.bottom > viewportHeight - 8) {
        newTop = coords.top - (rect.bottom - viewportHeight) - 16
      }

      // Adjust if overflowing right
      if (rect.right > viewportWidth - 8) {
        newLeft = viewportWidth - rect.width - 16
      }

      if (newTop !== coords.top || newLeft !== coords.left) {
        setCoords({ top: newTop, left: newLeft })
      }
    }
  }, [isOpen, coords])

  // Get transform origin based on position
  const getTransformOrigin = () => {
    switch (actualPosition) {
      case 'top': return 'bottom center'
      case 'bottom': return 'top center'
      case 'left': return 'right center'
      case 'right': return 'left center'
      default: return 'top center'
    }
  }

  const popoverContent = isOpen && coords && (
    <div
      ref={popoverRef}
      className={`fixed z-[9999] bg-card rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 ${popoverClassName}`}
      style={{
        top: coords.top,
        left: coords.left,
        width: typeof width === 'number' ? `${width}px` : width,
        maxHeight: `${maxHeight}px`,
        transformOrigin: getTransformOrigin(),
      }}
      onMouseEnter={handlePopoverEnter}
      onMouseLeave={handlePopoverLeave}
    >
      {content}
    </div>
  )

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={handleTriggerEnter}
        onMouseLeave={handleTriggerLeave}
        className="inline-flex"
      >
        {children}
      </div>
      {typeof document !== 'undefined' && createPortal(popoverContent, document.body)}
    </>
  )
}

// =============================================================================
// Convenience Components
// =============================================================================

interface PopoverHeaderProps {
  icon?: ReactNode
  title: string
  subtitle?: string
}

export function PopoverHeader({ icon, title, subtitle }: PopoverHeaderProps) {
  return (
    <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-750 rounded-t-lg">
      <div className="flex items-center gap-2">
        {icon && <span className="text-gray-500">{icon}</span>}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </span>
        {subtitle && (
          <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}

interface PopoverContentProps {
  children: ReactNode
  className?: string
}

export function PopoverContent({ children, className = '' }: PopoverContentProps) {
  return (
    <div className={`overflow-y-auto ${className}`}>
      {children}
    </div>
  )
}

export default HoverPopover
