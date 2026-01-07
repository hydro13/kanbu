/**
 * useResizable Hook
 *
 * Provides drag-to-resize functionality for panels/sidebars.
 * Stores width preference in localStorage per key.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-07
 * ===================================================================
 */

import { useState, useCallback, useEffect, useRef } from 'react'

// =============================================================================
// Types
// =============================================================================

export interface UseResizableOptions {
  /** Unique key for localStorage persistence */
  storageKey: string
  /** Default width in pixels */
  defaultWidth: number
  /** Minimum width in pixels */
  minWidth: number
  /** Maximum width in pixels */
  maxWidth: number
  /** Direction of resize handle */
  direction?: 'left' | 'right'
}

export interface UseResizableReturn {
  /** Current width in pixels */
  width: number
  /** Whether currently dragging */
  isDragging: boolean
  /** Props to spread on the resize handle element */
  handleProps: {
    onMouseDown: (e: React.MouseEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
  }
  /** Reset width to default */
  resetWidth: () => void
  /** Set width programmatically */
  setWidth: (width: number) => void
}

// =============================================================================
// Constants
// =============================================================================

const STORAGE_PREFIX = 'kanbu_sidebar_width_'

// =============================================================================
// Hook
// =============================================================================

export function useResizable({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  direction = 'right',
}: UseResizableOptions): UseResizableReturn {
  // Get initial width from localStorage or use default
  const getInitialWidth = useCallback(() => {
    if (typeof window === 'undefined') return defaultWidth
    const stored = localStorage.getItem(STORAGE_PREFIX + storageKey)
    if (stored) {
      const parsed = parseInt(stored, 10)
      if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed
      }
    }
    return defaultWidth
  }, [storageKey, defaultWidth, minWidth, maxWidth])

  const [width, setWidthState] = useState(getInitialWidth)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  // Clamp width to min/max bounds
  const clampWidth = useCallback(
    (w: number) => Math.min(maxWidth, Math.max(minWidth, w)),
    [minWidth, maxWidth]
  )

  // Save width to localStorage
  const saveWidth = useCallback(
    (w: number) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_PREFIX + storageKey, String(w))
      }
    },
    [storageKey]
  )

  // Set width with clamping and persistence
  const setWidth = useCallback(
    (newWidth: number) => {
      const clamped = clampWidth(newWidth)
      setWidthState(clamped)
      saveWidth(clamped)
    },
    [clampWidth, saveWidth]
  )

  // Reset to default width
  const resetWidth = useCallback(() => {
    setWidth(defaultWidth)
  }, [defaultWidth, setWidth])

  // Handle mouse/touch move during drag
  const handleMove = useCallback(
    (clientX: number) => {
      if (!isDragging) return

      const delta = direction === 'right'
        ? clientX - startXRef.current
        : startXRef.current - clientX

      const newWidth = clampWidth(startWidthRef.current + delta)
      setWidthState(newWidth)
    },
    [isDragging, direction, clampWidth]
  )

  // Handle drag end
  const handleEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false)
      saveWidth(width)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, width, saveWidth])

  // Mouse event handlers
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      e.preventDefault()
      handleMove(e.clientX)
    }

    const onMouseUp = () => {
      handleEnd()
    }

    if (isDragging) {
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [isDragging, handleMove, handleEnd])

  // Touch event handlers
  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (e.touches.length === 1 && touch) {
        handleMove(touch.clientX)
      }
    }

    const onTouchEnd = () => {
      handleEnd()
    }

    if (isDragging) {
      document.addEventListener('touchmove', onTouchMove, { passive: true })
      document.addEventListener('touchend', onTouchEnd)
      document.addEventListener('touchcancel', onTouchEnd)
    }

    return () => {
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [isDragging, handleMove, handleEnd])

  // Start drag from mouse
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startXRef.current = e.clientX
      startWidthRef.current = width
      setIsDragging(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width]
  )

  // Start drag from touch
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0]
      if (e.touches.length === 1 && touch) {
        startXRef.current = touch.clientX
        startWidthRef.current = width
        setIsDragging(true)
        document.body.style.userSelect = 'none'
      }
    },
    [width]
  )

  return {
    width,
    isDragging,
    handleProps: {
      onMouseDown,
      onTouchStart,
    },
    resetWidth,
    setWidth,
  }
}

export default useResizable
