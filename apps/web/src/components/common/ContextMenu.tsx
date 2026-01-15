/*
 * ContextMenu Component
 * Version: 1.0.0
 *
 * Reusable right-click context menu with submenu support.
 * Used as base for TaskContextMenu, ProjectContextMenu, etc.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: MAX-2026-01-11
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface MenuItemProps {
  id: string
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  submenu?: MenuItemProps[]
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

export interface ContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  items: MenuItemProps[]
  onClose: () => void
  minWidth?: number
  className?: string
}

export interface ContextMenuState {
  isOpen: boolean
  position: { x: number; y: number }
}

// =============================================================================
// Hook for Context Menu State
// =============================================================================

export function useContextMenu() {
  const [state, setState] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
  })

  const open = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setState({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
    })
  }, [])

  const close = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  return { ...state, open, close }
}

// =============================================================================
// Component
// =============================================================================

export function ContextMenu({
  isOpen,
  position,
  items,
  onClose,
  minWidth = 180,
  className,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)

  // Close on click outside or Escape
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  // Reset submenu when menu closes
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenu(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  // Adjust position to keep menu in viewport
  const adjustedPosition = { ...position }
  if (typeof window !== 'undefined') {
    const menuHeight = items.length * 36 + 16 // Approximate height
    if (position.x + minWidth > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - minWidth - 10
    }
    if (position.y + menuHeight > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - menuHeight - 10
    }
  }

  return (
    <div
      ref={menuRef}
      className={cn(
        'fixed z-50 bg-card rounded-lg shadow-lg',
        'border border-gray-200 dark:border-gray-700 py-1',
        className
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        minWidth,
      }}
    >
      {items.map((item) =>
        item.divider ? (
          <div
            key={item.id}
            className="my-1 border-t border-gray-200 dark:border-gray-700"
          />
        ) : item.submenu ? (
          <div
            key={item.id}
            className="relative"
            onMouseEnter={() => setActiveSubmenu(item.id)}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <button
              className={cn(
                'w-full px-3 py-2 text-sm text-left flex items-center justify-between',
                'hover:bg-accent',
                item.disabled && 'opacity-50 cursor-not-allowed'
              )}
              disabled={item.disabled}
            >
              <span className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
              <ChevronRightIcon />
            </button>
            {activeSubmenu === item.id && !item.disabled && (
              <div
                className={cn(
                  'absolute left-full top-0 min-w-[140px]',
                  'bg-card rounded-lg shadow-lg',
                  'border border-gray-200 dark:border-gray-700 py-1 ml-1'
                )}
              >
                {item.submenu.map((subitem) => (
                  <button
                    key={subitem.id}
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left flex items-center gap-2',
                      subitem.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-accent',
                      subitem.danger &&
                        !subitem.disabled &&
                        'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                    )}
                    onClick={() => {
                      if (!subitem.disabled && subitem.onClick) {
                        subitem.onClick()
                        onClose()
                      }
                    }}
                    disabled={subitem.disabled}
                  >
                    {subitem.icon}
                    {subitem.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <button
            key={item.id}
            className={cn(
              'w-full px-3 py-2 text-sm text-left flex items-center gap-2',
              item.danger && !item.disabled
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'hover:bg-accent',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => {
              if (!item.disabled && item.onClick) {
                item.onClick()
                onClose()
              }
            }}
            disabled={item.disabled}
          >
            {item.icon}
            {item.label}
          </button>
        )
      )}
    </div>
  )
}

// =============================================================================
// Icons
// =============================================================================

function ChevronRightIcon() {
  return (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5l7 7-7 7"
      />
    </svg>
  )
}

// =============================================================================
// Common Icons (exported for use in context menus)
// =============================================================================

export function OpenIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

export function StarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  )
}

export function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}

export function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export function ArchiveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  )
}

export function UsersIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

export function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  )
}

export function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

export default ContextMenu
