/*
 * UndoRedoButtons Component
 * Version: 1.0.0
 *
 * Undo/Redo buttons with toast notifications for the ViewSwitcher toolbar.
 * Only visible for users with edit permissions.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: (current)
 * Claude Code: Opus 4.5
 * Host: linux-dev
 * Signed: 2026-01-03
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { useUndoRedo, type ToastMessage } from '@/hooks/useUndoRedo'
import { useProjectPermissions } from '@/hooks/useProjectPermissions'

// =============================================================================
// Icons
// =============================================================================

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
  )
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

// =============================================================================
// Toast Component
// =============================================================================

interface UndoToastProps {
  toast: ToastMessage
  onDismiss: () => void
}

function UndoToast({ toast, onDismiss }: UndoToastProps) {
  const toastRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Animate in
    const el = toastRef.current
    if (el) {
      el.style.transform = 'translateY(100%)'
      el.style.opacity = '0'
      requestAnimationFrame(() => {
        el.style.transition = 'transform 200ms ease-out, opacity 200ms ease-out'
        el.style.transform = 'translateY(0)'
        el.style.opacity = '1'
      })
    }
  }, [])

  const iconMap = {
    success: <CheckIcon className="h-5 w-5 text-green-500" />,
    warning: <WarningIcon className="h-5 w-5 text-amber-500" />,
    error: <ErrorIcon className="h-5 w-5 text-red-500" />,
  }

  const bgMap = {
    success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
  }

  return createPortal(
    <div
      ref={toastRef}
      className={cn(
        'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border',
        'max-w-md',
        bgMap[toast.type]
      )}
      role="alert"
    >
      {iconMap[toast.type]}
      <span className="text-sm text-gray-700 dark:text-gray-200">{toast.message}</span>
      {toast.action && (
        <button
          onClick={toast.action.onClick}
          className="ml-2 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded"
        >
          {toast.action.label}
        </button>
      )}
      <button
        onClick={onDismiss}
        className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>,
    document.body
  )
}

// =============================================================================
// Main Component
// =============================================================================

export interface UndoRedoButtonsProps {
  projectId: number
  className?: string
}

export function UndoRedoButtons({ projectId, className }: UndoRedoButtonsProps) {
  const { canEdit } = useProjectPermissions(projectId)
  const {
    performUndo,
    performRedo,
    canUndo,
    canRedo,
    isProcessing,
    toast,
    dismissToast,
  } = useUndoRedo(projectId)

  // Don't render for viewers
  if (!canEdit) return null

  return (
    <>
      <div className={cn('flex items-center gap-0.5', className)}>
        <button
          onClick={performUndo}
          disabled={!canUndo || isProcessing}
          className={cn(
            'p-1.5 rounded transition-colors',
            canUndo && !isProcessing
              ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-accent'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          )}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <UndoIcon className="h-4 w-4" />
        </button>
        <button
          onClick={performRedo}
          disabled={!canRedo || isProcessing}
          className={cn(
            'p-1.5 rounded transition-colors',
            canRedo && !isProcessing
              ? 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-accent'
              : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
          )}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <RedoIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Toast notification */}
      {toast && <UndoToast toast={toast} onDismiss={dismissToast} />}
    </>
  )
}

export default UndoRedoButtons
