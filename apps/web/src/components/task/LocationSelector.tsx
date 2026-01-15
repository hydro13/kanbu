/*
 * LocationSelector Component
 * Version: 1.0.0
 *
 * Dropdown selectors for moving a task to a different column/swimlane.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 0e39bd3c-2fb0-45ca-9dba-d480f3531265
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-29T13:05 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect } from 'react'
import { trpc } from '@/lib/trpc'
import { ChevronDown, Loader2 } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface Column {
  id: number
  title: string
}

interface Swimlane {
  id: number
  name: string
}

export interface LocationSelectorProps {
  taskId: number
  projectId: number
  currentColumn: Column
  currentSwimlane: Swimlane | null
  onLocationChange?: (columnId: number, swimlaneId: number | null) => void
  disabled?: boolean
}

// =============================================================================
// DropdownSelector Component
// =============================================================================

interface DropdownSelectorProps<T> {
  label: string
  value: string
  options: T[]
  getOptionId: (option: T) => number
  getOptionLabel: (option: T) => string
  selectedId: number | null
  onSelect: (option: T) => void
  disabled?: boolean
  isLoading?: boolean
  emptyMessage?: string
}

function DropdownSelector<T>({
  label,
  value,
  options,
  getOptionId,
  getOptionLabel,
  selectedId,
  onSelect,
  disabled = false,
  isLoading = false,
  emptyMessage = 'No options available',
}: DropdownSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`flex items-center justify-between w-full text-sm py-0.5 transition-colors ${
          disabled ? 'cursor-not-allowed text-gray-400' : 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded'
        }`}
      >
        <span className="text-gray-600 dark:text-gray-400">{label}:</span>
        <span className="flex items-center gap-1 text-gray-900 dark:text-white">
          {value}
          {!disabled && <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : options.length > 0 ? (
            <div className="p-1">
              {options.map((option) => {
                const id = getOptionId(option)
                const isSelected = id === selectedId
                return (
                  <button
                    key={id}
                    onClick={() => {
                      onSelect(option)
                      setIsOpen(false)
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'hover:bg-accent text-gray-900 dark:text-white'
                    }`}
                  >
                    {getOptionLabel(option)}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
              {emptyMessage}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Component
// =============================================================================

export function LocationSelector({
  taskId,
  projectId,
  currentColumn,
  currentSwimlane,
  onLocationChange,
  disabled = false,
}: LocationSelectorProps) {
  const utils = trpc.useUtils()

  // Fetch project to get columns and swimlanes
  const { data: project, isLoading } = trpc.project.get.useQuery(
    { projectId },
    { enabled: projectId > 0 }
  )

  // Move task mutation
  const moveMutation = trpc.task.move.useMutation({
    onSuccess: () => {
      utils.task.get.invalidate({ taskId })
      utils.task.list.invalidate()
    },
  })

  const columns = project?.columns ?? []
  const swimlanes = project?.swimlanes ?? []
  const hasMultipleSwimlanes = swimlanes.length > 1

  const handleColumnChange = (column: Column) => {
    if (column.id === currentColumn.id) return

    moveMutation.mutate(
      {
        taskId,
        columnId: column.id,
        swimlaneId: currentSwimlane?.id ?? null,
      },
      {
        onSuccess: () => {
          onLocationChange?.(column.id, currentSwimlane?.id ?? null)
        },
      }
    )
  }

  const handleSwimlaneChange = (swimlane: Swimlane) => {
    if (swimlane.id === currentSwimlane?.id) return

    moveMutation.mutate(
      {
        taskId,
        columnId: currentColumn.id,
        swimlaneId: swimlane.id,
      },
      {
        onSuccess: () => {
          onLocationChange?.(currentColumn.id, swimlane.id)
        },
      }
    )
  }

  const isDisabled = disabled || moveMutation.isPending

  return (
    <div className="space-y-1">
      {moveMutation.isPending && (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
          <Loader2 className="w-4 h-4 animate-spin" />
          Moving...
        </div>
      )}

      <DropdownSelector
        label="Column"
        value={currentColumn.title}
        options={columns}
        getOptionId={(c) => c.id}
        getOptionLabel={(c) => c.title}
        selectedId={currentColumn.id}
        onSelect={handleColumnChange}
        disabled={isDisabled}
        isLoading={isLoading}
      />

      {hasMultipleSwimlanes && (
        <DropdownSelector
          label="Swimlane"
          value={currentSwimlane?.name ?? 'None'}
          options={swimlanes}
          getOptionId={(s) => s.id}
          getOptionLabel={(s) => s.name}
          selectedId={currentSwimlane?.id ?? null}
          onSelect={handleSwimlaneChange}
          disabled={isDisabled}
          isLoading={isLoading}
        />
      )}
    </div>
  )
}

export default LocationSelector
