/*
 * TaskContextMenu Component
 * Version: 1.0.0
 *
 * Right-click context menu for tasks with quick actions:
 * move, priority, close/reopen, delete.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T20:10 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface TaskContextMenuProps {
  taskId: number
  projectId: number
  currentColumnId: number
  currentPriority: number
  isOpen: boolean
  position: { x: number; y: number }
  columns: Array<{ id: number; title: string }>
  onClose: () => void
  onOpenDetail?: () => void
}

interface MenuItem {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  submenu?: MenuItem[]
  danger?: boolean
  disabled?: boolean
  divider?: boolean
}

// =============================================================================
// Priority Labels
// =============================================================================

const PRIORITIES = [
  { value: 0, label: 'None', color: 'bg-gray-400' },
  { value: 1, label: 'Low', color: 'bg-blue-400' },
  { value: 2, label: 'Normal', color: 'bg-yellow-400' },
  { value: 3, label: 'High', color: 'bg-orange-400' },
  { value: 4, label: 'Urgent', color: 'bg-red-500' },
]

// =============================================================================
// Component
// =============================================================================

export function TaskContextMenu({
  taskId,
  projectId,
  currentColumnId,
  currentPriority,
  isOpen,
  position,
  columns,
  onClose,
  onOpenDetail,
}: TaskContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)

  const utils = trpc.useUtils()

  // Move task mutation
  const moveMutation = trpc.task.move.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId })
      onClose()
    },
  })

  // Update task mutation (for priority)
  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId })
      onClose()
    },
  })

  // Close task mutation
  const closeMutation = trpc.task.close.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId })
      onClose()
    },
  })

  // Delete task mutation
  const deleteMutation = trpc.task.delete.useMutation({
    onSuccess: () => {
      utils.task.list.invalidate({ projectId })
      onClose()
    },
  })

  // Close on click outside
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

  // Handle move to column
  const handleMoveToColumn = useCallback(
    (columnId: number) => {
      if (columnId === currentColumnId) return
      moveMutation.mutate({ taskId, columnId, position: 1 })
    },
    [taskId, currentColumnId, moveMutation]
  )

  // Handle priority change
  const handlePriorityChange = useCallback(
    (priority: number) => {
      if (priority === currentPriority) return
      updateMutation.mutate({ taskId, priority })
    },
    [taskId, currentPriority, updateMutation]
  )

  // Handle close task
  const handleCloseTask = useCallback(() => {
    closeMutation.mutate({ taskId })
  }, [taskId, closeMutation])

  // Handle delete task
  const handleDeleteTask = useCallback(() => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteMutation.mutate({ taskId })
    }
  }, [taskId, deleteMutation])

  if (!isOpen) return null

  // Build menu items
  const menuItems: MenuItem[] = [
    {
      label: 'Open',
      icon: <OpenIcon />,
      onClick: onOpenDetail,
    },
    { divider: true, label: '' },
    {
      label: 'Move to',
      icon: <MoveIcon />,
      submenu: columns
        .filter((col) => col.id !== currentColumnId)
        .map((col) => ({
          label: col.title,
          onClick: () => handleMoveToColumn(col.id),
        })),
    },
    {
      label: 'Priority',
      icon: <FlagIcon />,
      submenu: PRIORITIES.map((p) => ({
        label: p.label,
        icon: <span className={cn('w-2 h-2 rounded-full', p.color)} />,
        onClick: () => handlePriorityChange(p.value),
        disabled: p.value === currentPriority,
      })),
    },
    { divider: true, label: '' },
    {
      label: 'Close task',
      icon: <CheckIcon />,
      onClick: handleCloseTask,
    },
    {
      label: 'Delete',
      icon: <TrashIcon />,
      onClick: handleDeleteTask,
      danger: true,
    },
  ]

  // Adjust position to keep menu in viewport
  const adjustedPosition = { ...position }
  if (typeof window !== 'undefined') {
    const menuWidth = 200
    const menuHeight = 250
    if (position.x + menuWidth > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - menuWidth - 10
    }
    if (position.y + menuHeight > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - menuHeight - 10
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-card rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {menuItems.map((item, index) =>
        item.divider ? (
          <div
            key={index}
            className="my-1 border-t border-gray-200 dark:border-gray-700"
          />
        ) : item.submenu ? (
          <div
            key={index}
            className="relative"
            onMouseEnter={() => setActiveSubmenu(item.label)}
            onMouseLeave={() => setActiveSubmenu(null)}
          >
            <button
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {item.icon}
                {item.label}
              </span>
              <ChevronRightIcon />
            </button>
            {activeSubmenu === item.label && (
              <div className="absolute left-full top-0 min-w-[140px] bg-card rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 ml-1">
                {item.submenu.map((subitem, subindex) => (
                  <button
                    key={subindex}
                    className={cn(
                      'w-full px-3 py-2 text-sm text-left flex items-center gap-2',
                      subitem.disabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-accent'
                    )}
                    onClick={subitem.disabled ? undefined : subitem.onClick}
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
            key={index}
            className={cn(
              'w-full px-3 py-2 text-sm text-left flex items-center gap-2',
              item.danger
                ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                : 'hover:bg-accent',
              item.disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={item.disabled ? undefined : item.onClick}
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

function OpenIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  )
}

function MoveIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  )
}

function FlagIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

export default TaskContextMenu
