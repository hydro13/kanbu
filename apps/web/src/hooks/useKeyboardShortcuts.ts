/*
 * useKeyboardShortcuts Hook
 * Version: 1.0.0
 *
 * Global keyboard handler with context-aware shortcuts and conflict prevention.
 * Handles all keyboard shortcuts for the application.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T21:05 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import {
  SHORTCUTS,
  matchesShortcut,
  isInputElement,
  type ShortcutDefinition,
  type ShortcutCategory,
} from '@/lib/shortcuts'

// =============================================================================
// Types
// =============================================================================

export type ShortcutHandler = (event: KeyboardEvent, shortcut: ShortcutDefinition) => void

export interface ShortcutHandlers {
  // Global
  onShowHelp?: () => void
  onCommandPalette?: () => void
  onToggleSidebar?: () => void
  onCloseModal?: () => void

  // Board
  onNewTask?: () => void
  onFocusFilter?: () => void
  onFocusColumn?: (columnIndex: number) => void
  onNavigate?: (direction: 'up' | 'down' | 'left' | 'right') => void

  // Task (when selected)
  onOpenDetail?: () => void
  onEditTitle?: () => void
  onChangePriority?: () => void
  onMoveTask?: () => void
  onCloseTask?: () => void
  onDeleteTask?: () => void
}

export interface UseKeyboardShortcutsOptions {
  /** Which shortcut categories are active (default: all) */
  activeCategories?: ShortcutCategory[]
  /** Whether shortcuts are enabled (default: true) */
  enabled?: boolean
  /** Whether a task is currently selected */
  hasSelectedTask?: boolean
  /** Custom handler for unhandled shortcuts */
  onShortcut?: ShortcutHandler
}

// =============================================================================
// Hook
// =============================================================================

export function useKeyboardShortcuts(
  handlers: ShortcutHandlers,
  options: UseKeyboardShortcutsOptions = {}
) {
  const {
    activeCategories = ['global', 'board', 'task'],
    enabled = true,
    hasSelectedTask = false,
    onShortcut,
  } = options

  // Use refs to avoid stale closures
  const handlersRef = useRef(handlers)
  const optionsRef = useRef({ activeCategories, hasSelectedTask, onShortcut })

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = handlers
    optionsRef.current = { activeCategories, hasSelectedTask, onShortcut }
  }, [handlers, activeCategories, hasSelectedTask, onShortcut])

  // Main keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { activeCategories, hasSelectedTask, onShortcut } = optionsRef.current
    const h = handlersRef.current

    // Check if we're in an input field
    const inInput = isInputElement(event.target)

    // Find matching shortcut
    for (const shortcut of SHORTCUTS) {
      // Skip if category not active
      if (!activeCategories.includes(shortcut.category)) continue

      // Skip task shortcuts if no task selected
      if (shortcut.category === 'task' && !hasSelectedTask) continue

      // Skip if in input and shortcut doesn't allow it
      if (inInput && !shortcut.allowInInputs) continue

      // Check if this event matches the shortcut
      if (!matchesShortcut(event, shortcut)) continue

      // Prevent default browser behavior
      event.preventDefault()
      event.stopPropagation()

      // Call custom handler if provided
      if (onShortcut) {
        onShortcut(event, shortcut)
      }

      // Handle the shortcut
      switch (shortcut.id) {
        // Global
        case 'show-help':
          h.onShowHelp?.()
          break
        case 'command-palette':
          h.onCommandPalette?.()
          break
        case 'toggle-sidebar':
          h.onToggleSidebar?.()
          break
        case 'close-modal':
          h.onCloseModal?.()
          break

        // Board
        case 'new-task':
          h.onNewTask?.()
          break
        case 'focus-filter':
          h.onFocusFilter?.()
          break
        case 'column-1':
          h.onFocusColumn?.(0)
          break
        case 'column-2':
          h.onFocusColumn?.(1)
          break
        case 'column-3':
          h.onFocusColumn?.(2)
          break
        case 'column-4':
          h.onFocusColumn?.(3)
          break
        case 'column-5':
          h.onFocusColumn?.(4)
          break
        case 'navigate-up':
          h.onNavigate?.('up')
          break
        case 'navigate-down':
          h.onNavigate?.('down')
          break
        case 'navigate-left':
          h.onNavigate?.('left')
          break
        case 'navigate-right':
          h.onNavigate?.('right')
          break

        // Task
        case 'open-detail':
          h.onOpenDetail?.()
          break
        case 'edit-title':
          h.onEditTitle?.()
          break
        case 'change-priority':
          h.onChangePriority?.()
          break
        case 'move-task':
          h.onMoveTask?.()
          break
        case 'close-task':
          h.onCloseTask?.()
          break
        case 'delete-task':
          h.onDeleteTask?.()
          break
      }

      // Only handle one shortcut per keypress
      return
    }
  }, [])

  // Register global keyboard handler
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled, handleKeyDown])
}

// =============================================================================
// Shortcut Help Hook
// =============================================================================

/**
 * Simple hook for showing/hiding the shortcuts help modal
 */
export function useShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])
  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  return { isOpen, open, close, toggle }
}

export default useKeyboardShortcuts
