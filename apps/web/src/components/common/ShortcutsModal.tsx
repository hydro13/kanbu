/*
 * ShortcutsModal Component
 * Version: 2.0.0
 *
 * Modal displaying all available keyboard shortcuts.
 * Triggered by pressing the ? key.
 * Updated to show new navigation and context-aware shortcuts.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-11
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useCallback, useMemo } from 'react'
import { SHORTCUT_GROUPS, formatShortcut, isMac } from '@/lib/shortcuts'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface ShortcutsModalProps {
  isOpen: boolean
  onClose: () => void
}

// =============================================================================
// Icons
// =============================================================================

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

function KeyboardIcon() {
  return (
    <svg
      className="h-6 w-6"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function ShortcutsModal({ isOpen, onClose }: ShortcutsModalProps) {
  // Filter out empty groups
  const activeGroups = useMemo(() => {
    return SHORTCUT_GROUPS.filter(group => group.shortcuts.length > 0)
  }, [])

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-blue-500 dark:text-blue-400">
              <KeyboardIcon />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isMac() ? 'macOS' : 'Windows/Linux'} keyboard shortcuts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-accent rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(80vh-120px)] p-6">
          <div className="space-y-8">
            {activeGroups.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  {group.label}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      className={cn(
                        'flex items-center justify-between gap-4 px-3 py-2 rounded-lg',
                        'bg-gray-50 dark:bg-gray-700/50'
                      )}
                    >
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {shortcut.description}
                      </span>
                      <kbd
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded',
                          'text-xs font-mono font-medium',
                          'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200',
                          'border border-gray-200 dark:border-gray-500',
                          'shadow-sm'
                        )}
                      >
                        {formatShortcut(shortcut)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">?</kbd> anytime to show this help
          </p>
        </div>
      </div>
    </div>
  )
}

export default ShortcutsModal
