/*
 * useKeyboardShortcuts Hook
 * Version: 2.0.0
 *
 * Global keyboard handler with context-aware shortcuts and conflict prevention.
 * Handles all keyboard shortcuts for the application, including chord sequences.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Added chord shortcut support (G+key navigation)
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
// Chord Shortcut Handling
// =============================================================================

/** Timeout for chord sequence (ms) */
const CHORD_TIMEOUT = 500

/** Check if a shortcut is a chord (e.g., "g d") */
function isChordShortcut(shortcut: ShortcutDefinition): boolean {
  return shortcut.key.includes(' ')
}

/** Parse chord into parts */
function parseChord(key: string): string[] {
  return key.toLowerCase().split(' ')
}

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

  // Navigation (chord shortcuts: G+key)
  onGotoDashboard?: () => void
  onGotoTasks?: () => void
  onGotoInbox?: () => void
  onGotoWorkspaces?: () => void
  onGotoNotes?: () => void

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
    activeCategories = ['global', 'navigation', 'board', 'task'],
    enabled = true,
    hasSelectedTask = false,
    onShortcut,
  } = options

  // Use refs to avoid stale closures
  const handlersRef = useRef(handlers)
  const optionsRef = useRef({ activeCategories, hasSelectedTask, onShortcut })

  // Chord state: track pending first key of chord
  const pendingChordRef = useRef<{ key: string; timestamp: number } | null>(null)
  const chordTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Update refs when handlers change
  useEffect(() => {
    handlersRef.current = handlers
    optionsRef.current = { activeCategories, hasSelectedTask, onShortcut }
  }, [handlers, activeCategories, hasSelectedTask, onShortcut])

  // Clear chord timeout
  const clearChordTimeout = useCallback(() => {
    if (chordTimeoutRef.current) {
      clearTimeout(chordTimeoutRef.current)
      chordTimeoutRef.current = null
    }
    pendingChordRef.current = null
  }, [])

  // Execute shortcut handler
  const executeShortcut = useCallback((shortcut: ShortcutDefinition, event: KeyboardEvent) => {
    const h = handlersRef.current
    const { onShortcut } = optionsRef.current

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

      // Navigation (chord shortcuts)
      case 'goto-dashboard':
        h.onGotoDashboard?.()
        break
      case 'goto-tasks':
        h.onGotoTasks?.()
        break
      case 'goto-inbox':
        h.onGotoInbox?.()
        break
      case 'goto-workspaces':
        h.onGotoWorkspaces?.()
        break
      case 'goto-notes':
        h.onGotoNotes?.()
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
  }, [])

  // Main keyboard event handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { activeCategories, hasSelectedTask } = optionsRef.current
    const pressedKey = event.key.toLowerCase()

    // Check if we're in an input field
    const inInput = isInputElement(event.target)

    // Handle chord sequences
    const now = Date.now()

    // Check if we have a pending chord first key
    if (pendingChordRef.current) {
      const pending = pendingChordRef.current

      // Check if within timeout
      if (now - pending.timestamp < CHORD_TIMEOUT) {
        // Look for matching chord shortcut
        for (const shortcut of SHORTCUTS) {
          if (!isChordShortcut(shortcut)) continue
          if (!activeCategories.includes(shortcut.category)) continue
          if (inInput && !shortcut.allowInInputs) continue

          const [firstKey, secondKey] = parseChord(shortcut.key)

          if (pending.key === firstKey && pressedKey === secondKey) {
            event.preventDefault()
            event.stopPropagation()
            clearChordTimeout()
            executeShortcut(shortcut, event)
            return
          }
        }
      }

      // Chord didn't match, clear it
      clearChordTimeout()
    }

    // Check if this is the first key of a chord
    const chordStartShortcuts = SHORTCUTS.filter(s =>
      isChordShortcut(s) &&
      activeCategories.includes(s.category) &&
      (!inInput || s.allowInInputs)
    )

    for (const shortcut of chordStartShortcuts) {
      const [firstKey] = parseChord(shortcut.key)
      if (pressedKey === firstKey) {
        // This could be the start of a chord - wait for second key
        event.preventDefault()
        pendingChordRef.current = { key: pressedKey, timestamp: now }

        // Set timeout to clear pending chord
        chordTimeoutRef.current = setTimeout(() => {
          pendingChordRef.current = null
        }, CHORD_TIMEOUT)

        return
      }
    }

    // Find matching single-key shortcut
    for (const shortcut of SHORTCUTS) {
      // Skip chord shortcuts (handled above)
      if (isChordShortcut(shortcut)) continue

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

      executeShortcut(shortcut, event)

      // Only handle one shortcut per keypress
      return
    }
  }, [clearChordTimeout, executeShortcut])

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
