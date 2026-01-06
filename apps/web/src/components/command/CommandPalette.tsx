/*
 * CommandPalette Component
 * Version: 1.0.0
 *
 * Cmd+K command palette for quick navigation and actions.
 * Supports task search, navigation, and quick actions with keyboard control.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 73a280f4-f735-47a2-9803-e570fa6a86f7
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T20:35 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface CommandItem {
  id: string
  type: 'action' | 'navigation' | 'task'
  label: string
  description?: string
  icon?: React.ReactNode
  shortcut?: string
  onSelect: () => void
}

export interface CommandPaletteProps {
  projectId?: number
  onOpenTaskDetail?: (taskId: number) => void
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5 text-gray-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  )
}

function TaskIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  )
}

function NavigateIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ActionIcon() {
  return (
    <svg
      className="h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  )
}

function getTypeIcon(type: CommandItem['type']) {
  switch (type) {
    case 'task':
      return <TaskIcon />
    case 'navigation':
      return <NavigateIcon />
    case 'action':
      return <ActionIcon />
    default:
      return null
  }
}

// =============================================================================
// Hook: useCommandPalette
// =============================================================================

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return { isOpen, setIsOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) }
}

// =============================================================================
// Component
// =============================================================================

export function CommandPalette({ projectId: propProjectId, onOpenTaskDetail }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const { isOpen, close } = useCommandPalette()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const params = useParams<{ projectId?: string }>()

  // Get projectId from props or URL params
  const projectId = propProjectId ?? (params.projectId ? parseInt(params.projectId, 10) : undefined)

  // Fetch tasks for search (only when palette is open and we have a projectId)
  const { data: tasks } = trpc.task.list.useQuery(
    { projectId: projectId! },
    { enabled: isOpen && !!projectId }
  )

  // Build command items
  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = []

    // Navigation commands (always available)
    items.push({
      id: 'nav-home',
      type: 'navigation',
      label: 'Go to Home',
      description: 'Dashboard overview',
      shortcut: 'G H',
      onSelect: () => {
        navigate('/')
        close()
      },
    })

    items.push({
      id: 'nav-projects',
      type: 'navigation',
      label: 'Go to Projects',
      description: 'View all projects',
      shortcut: 'G P',
      onSelect: () => {
        navigate('/workspaces')
        close()
      },
    })

    if (projectId) {
      items.push({
        id: 'nav-board',
        type: 'navigation',
        label: 'Go to Board',
        description: 'Current project board',
        shortcut: 'G B',
        onSelect: () => {
          navigate(`/project/${projectId}/board`)
          close()
        },
      })
    }

    // Action commands
    if (projectId) {
      items.push({
        id: 'action-new-task',
        type: 'action',
        label: 'Create New Task',
        description: 'Add a task to the board',
        shortcut: 'C',
        onSelect: () => {
          // TODO: Open create task modal
          close()
        },
      })
    }

    // Task search results
    if (tasks && query.length >= 2) {
      const lowerQuery = query.toLowerCase()
      const matchingTasks = tasks
        .filter(
          (task) =>
            task.title.toLowerCase().includes(lowerQuery) ||
            task.reference?.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 10)

      matchingTasks.forEach((task) => {
        items.push({
          id: `task-${task.id}`,
          type: 'task',
          label: task.title,
          description: task.reference || undefined,
          onSelect: () => {
            if (onOpenTaskDetail) {
              onOpenTaskDetail(task.id)
            } else {
              navigate(`/project/${projectId}/board?task=${task.id}`)
            }
            close()
          },
        })
      })
    }

    // Filter by query
    if (query.length > 0 && query.length < 2) {
      // Only filter non-task items when query is short
      return items.filter(
        (item) =>
          item.type !== 'task' &&
          (item.label.toLowerCase().includes(query.toLowerCase()) ||
            item.description?.toLowerCase().includes(query.toLowerCase()))
      )
    }

    return items
  }, [query, tasks, projectId, navigate, close, onOpenTaskDetail])

  // Reset selection when items change
  useEffect(() => {
    setSelectedIndex(0)
  }, [commandItems.length])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(
        `[data-index="${selectedIndex}"]`
      )
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev < commandItems.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : commandItems.length - 1
          )
          break
        case 'Enter':
          e.preventDefault()
          if (commandItems[selectedIndex]) {
            commandItems[selectedIndex].onSelect()
          }
          break
        case 'Escape':
          e.preventDefault()
          close()
          break
      }
    },
    [commandItems, selectedIndex, close]
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <SearchIcon />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, navigate, or run actions..."
            className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 outline-none text-sm"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {commandItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
              {query.length > 0
                ? 'No results found'
                : 'Type to search tasks or actions'}
            </div>
          ) : (
            <div className="space-y-1">
              {commandItems.map((item, index) => (
                <button
                  key={item.id}
                  data-index={index}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                    selectedIndex === index
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  )}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <span
                    className={cn(
                      'flex-shrink-0',
                      selectedIndex === index
                        ? 'text-blue-500 dark:text-blue-400'
                        : 'text-gray-400 dark:text-gray-500'
                    )}
                  >
                    {item.icon || getTypeIcon(item.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {item.label}
                    </div>
                    {item.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {item.description}
                      </div>
                    )}
                  </div>
                  {item.shortcut && (
                    <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
              select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">⌘K</kbd>
            toggle
          </span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
