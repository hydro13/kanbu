/*
 * FilterBar Component
 * Version: 1.0.0
 *
 * Advanced filter bar with quick filters, tag selection, priority,
 * assignee, date range, and saved filter presets.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:50 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react'
import type { FilterState, QuickFilter, SavedFilter } from '@/hooks/useFilters'

// =============================================================================
// Types
// =============================================================================

interface Tag {
  id: number
  name: string
  color: string | null
}

interface User {
  id: number
  username: string
  name: string | null
  avatarUrl: string | null
}

interface Column {
  id: number
  title: string
}

interface FilterBarProps {
  projectId: number
  filters: FilterState
  hasActiveFilters: boolean
  activeFilterCount: number
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  onFiltersChange: (filters: Partial<FilterState>) => void
  onClearFilters: () => void
  onToggleTag: (tagId: number) => void
  // Data for dropdowns
  tags: Tag[]
  users: User[]
  columns: Column[]
  currentUserId?: number
  // Quick filters
  quickFilters?: QuickFilter[]
  onApplyQuickFilter?: (filter: QuickFilter) => void
  // Saved filters
  savedFilters?: SavedFilter[]
  onSaveFilter?: (name: string) => void
  onLoadFilter?: (filter: SavedFilter) => void
  onDeleteFilter?: (id: string) => void
}

// =============================================================================
// Icons
// =============================================================================

function FilterIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  )
}

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CloseIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function ChevronDownIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function BookmarkIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}

function TrashIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

// =============================================================================
// Priority Config
// =============================================================================

const priorityOptions = [
  { value: 0, label: 'Low', color: 'bg-gray-400' },
  { value: 1, label: 'Medium', color: 'bg-blue-500' },
  { value: 2, label: 'High', color: 'bg-orange-500' },
  { value: 3, label: 'Urgent', color: 'bg-red-500' },
]

// =============================================================================
// Dropdown Components
// =============================================================================

interface DropdownProps {
  trigger: React.ReactNode
  children: React.ReactNode
  isOpen: boolean
  onClose: () => void
  align?: 'left' | 'right'
}

function Dropdown({ trigger, children, isOpen, onClose, align = 'left' }: DropdownProps) {
  return (
    <div className="relative">
      {trigger}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div
            className={`absolute top-full mt-1 w-56 bg-card rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            {children}
          </div>
        </>
      )}
    </div>
  )
}

// =============================================================================
// Filter Button Component
// =============================================================================

interface FilterButtonProps {
  label: string
  isActive: boolean
  onClick: () => void
  onClear?: () => void
  children?: React.ReactNode
}

function FilterButton({ label, isActive, onClick, onClear, children }: FilterButtonProps) {
  return (
    <div className="flex items-center">
      <button
        onClick={onClick}
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-l-md border transition-colors ${
          isActive
            ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
      >
        {label}
        {children}
        <ChevronDownIcon className="h-3 w-3" />
      </button>
      {isActive && onClear && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClear()
          }}
          className="px-1.5 py-1.5 border-y border-r border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-r-md dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
        >
          <CloseIcon className="h-3 w-3" />
        </button>
      )}
      {!isActive && (
        <span className="w-0" /> // Placeholder for consistent spacing
      )}
    </div>
  )
}

// =============================================================================
// Main FilterBar Component
// =============================================================================

export function FilterBar({
  filters,
  hasActiveFilters,
  activeFilterCount,
  onFilterChange,
  onClearFilters,
  onToggleTag,
  tags,
  users,
  columns,
  currentUserId,
  quickFilters = [],
  onApplyQuickFilter,
  savedFilters = [],
  onSaveFilter,
  onLoadFilter,
  onDeleteFilter,
}: FilterBarProps) {
  // Dropdown states
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [saveFilterName, setSaveFilterName] = useState('')

  const closeDropdown = useCallback(() => setOpenDropdown(null), [])
  const toggleDropdown = useCallback((name: string) => {
    setOpenDropdown((prev) => (prev === name ? null : name))
  }, [])

  // Handle quick filter with current user
  const handleQuickFilter = useCallback(
    (qf: QuickFilter) => {
      if (qf.id === 'my-tasks' && currentUserId) {
        onFilterChange('assigneeId', currentUserId)
      } else if (onApplyQuickFilter) {
        onApplyQuickFilter(qf)
      }
      closeDropdown()
    },
    [currentUserId, onFilterChange, onApplyQuickFilter, closeDropdown]
  )

  // Handle save filter
  const handleSaveFilter = useCallback(() => {
    if (saveFilterName.trim() && onSaveFilter) {
      onSaveFilter(saveFilterName.trim())
      setSaveFilterName('')
      closeDropdown()
    }
  }, [saveFilterName, onSaveFilter, closeDropdown])

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      {/* Filter Icon */}
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
        <FilterIcon className="h-4 w-4" />
        <span className="text-sm font-medium">Filters</span>
        {hasActiveFilters && (
          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded dark:bg-blue-900/50 dark:text-blue-300">
            {activeFilterCount}
          </span>
        )}
      </div>

      <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Quick Filters */}
      {quickFilters.length > 0 && (
        <Dropdown
          isOpen={openDropdown === 'quick'}
          onClose={closeDropdown}
          trigger={
            <button
              onClick={() => toggleDropdown('quick')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Quick Filters
              <ChevronDownIcon className="h-3 w-3" />
            </button>
          }
        >
          <div className="py-1">
            {quickFilters.map((qf) => (
              <button
                key={qf.id}
                onClick={() => handleQuickFilter(qf)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {qf.label}
              </button>
            ))}
          </div>
        </Dropdown>
      )}

      {/* Tag Filter */}
      <Dropdown
        isOpen={openDropdown === 'tags'}
        onClose={closeDropdown}
        trigger={
          <FilterButton
            label="Tags"
            isActive={filters.tagIds.length > 0}
            onClick={() => toggleDropdown('tags')}
            onClear={() => onFilterChange('tagIds', [])}
          >
            {filters.tagIds.length > 0 && (
              <span className="ml-1 text-xs">({filters.tagIds.length})</span>
            )}
          </FilterButton>
        }
      >
        <div className="max-h-64 overflow-y-auto py-1">
          {tags.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
              No tags available
            </div>
          ) : (
            tags.map((tag) => {
              const isSelected = filters.tagIds.includes(tag.id)
              return (
                <button
                  key={tag.id}
                  onClick={() => onToggleTag(tag.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: tag.color ?? '#6B7280' }}
                  />
                  <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                    {tag.name}
                  </span>
                  {isSelected && (
                    <CheckIcon className="text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              )
            })
          )}
        </div>
      </Dropdown>

      {/* Priority Filter */}
      <Dropdown
        isOpen={openDropdown === 'priority'}
        onClose={closeDropdown}
        trigger={
          <FilterButton
            label="Priority"
            isActive={filters.priority !== null}
            onClick={() => toggleDropdown('priority')}
            onClear={() => onFilterChange('priority', null)}
          >
            {filters.priority !== null && (
              <span className="ml-1 text-xs">
                ({priorityOptions.find((p) => p.value === filters.priority)?.label})
              </span>
            )}
          </FilterButton>
        }
      >
        <div className="py-1">
          {priorityOptions.map((priority) => (
            <button
              key={priority.value}
              onClick={() => {
                onFilterChange('priority', priority.value)
                closeDropdown()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
            >
              <span className={`w-2 h-2 rounded-full ${priority.color}`} />
              <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                {priority.label}
              </span>
              {filters.priority === priority.value && (
                <CheckIcon className="text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      </Dropdown>

      {/* Assignee Filter */}
      <Dropdown
        isOpen={openDropdown === 'assignee'}
        onClose={closeDropdown}
        trigger={
          <FilterButton
            label="Assignee"
            isActive={filters.assigneeId !== null}
            onClick={() => toggleDropdown('assignee')}
            onClear={() => onFilterChange('assigneeId', null)}
          >
            {filters.assigneeId !== null && (
              <span className="ml-1 text-xs">
                ({users.find((u) => u.id === filters.assigneeId)?.name ?? 'User'})
              </span>
            )}
          </FilterButton>
        }
      >
        <div className="max-h-64 overflow-y-auto py-1">
          {currentUserId && (
            <>
              <button
                onClick={() => {
                  onFilterChange('assigneeId', currentUserId)
                  closeDropdown()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="flex-1 text-left text-gray-700 dark:text-gray-300 font-medium">
                  Assigned to me
                </span>
                {filters.assigneeId === currentUserId && (
                  <CheckIcon className="text-blue-600 dark:text-blue-400" />
                )}
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            </>
          )}
          {users.map((user) => (
            <button
              key={user.id}
              onClick={() => {
                onFilterChange('assigneeId', user.id)
                closeDropdown()
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name ?? user.username}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                  {(user.name ?? user.username).charAt(0).toUpperCase()}
                </span>
              )}
              <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                {user.name ?? user.username}
              </span>
              {filters.assigneeId === user.id && (
                <CheckIcon className="text-blue-600 dark:text-blue-400" />
              )}
            </button>
          ))}
        </div>
      </Dropdown>

      {/* Column Filter */}
      {columns.length > 0 && (
        <Dropdown
          isOpen={openDropdown === 'column'}
          onClose={closeDropdown}
          trigger={
            <FilterButton
              label="Column"
              isActive={filters.columnId !== null}
              onClick={() => toggleDropdown('column')}
              onClear={() => onFilterChange('columnId', null)}
            >
              {filters.columnId !== null && (
                <span className="ml-1 text-xs">
                  ({columns.find((c) => c.id === filters.columnId)?.title})
                </span>
              )}
            </FilterButton>
          }
        >
          <div className="py-1">
            {columns.map((column) => (
              <button
                key={column.id}
                onClick={() => {
                  onFilterChange('columnId', column.id)
                  closeDropdown()
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              >
                <span className="flex-1 text-left text-gray-700 dark:text-gray-300">
                  {column.title}
                </span>
                {filters.columnId === column.id && (
                  <CheckIcon className="text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </Dropdown>
      )}

      {/* Due Date Filter */}
      <Dropdown
        isOpen={openDropdown === 'dueDate'}
        onClose={closeDropdown}
        trigger={
          <FilterButton
            label="Due Date"
            isActive={!!filters.dueDateFrom || !!filters.dueDateTo}
            onClick={() => toggleDropdown('dueDate')}
            onClear={() => {
              onFilterChange('dueDateFrom', null)
              onFilterChange('dueDateTo', null)
            }}
          />
        }
      >
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              From
            </label>
            <input
              type="date"
              value={filters.dueDateFrom ?? ''}
              onChange={(e) => onFilterChange('dueDateFrom', e.target.value || null)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              To
            </label>
            <input
              type="date"
              value={filters.dueDateTo ?? ''}
              onChange={(e) => onFilterChange('dueDateTo', e.target.value || null)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
            />
          </div>
          {/* Quick date buttons */}
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => {
                const today = new Date().toISOString().slice(0, 10)
                onFilterChange('dueDateFrom', today)
                onFilterChange('dueDateTo', today)
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Today
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const weekEnd = new Date(today)
                weekEnd.setDate(today.getDate() + 7)
                onFilterChange('dueDateFrom', today.toISOString().slice(0, 10))
                onFilterChange('dueDateTo', weekEnd.toISOString().slice(0, 10))
              }}
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              Next 7 days
            </button>
            <button
              onClick={() => {
                const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
                onFilterChange('dueDateFrom', null)
                onFilterChange('dueDateTo', yesterday)
              }}
              className="px-2 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:text-red-300"
            >
              Overdue
            </button>
          </div>
        </div>
      </Dropdown>

      {/* Include Completed Toggle */}
      <button
        onClick={() => onFilterChange('includeCompleted', !filters.includeCompleted)}
        className={`inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border transition-colors ${
          filters.includeCompleted
            ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
        }`}
      >
        {filters.includeCompleted && <CheckIcon className="h-3 w-3" />}
        Show Completed
      </button>

      <div className="flex-1" />

      {/* Saved Filters */}
      {(savedFilters.length > 0 || hasActiveFilters) && (
        <Dropdown
          isOpen={openDropdown === 'saved'}
          onClose={closeDropdown}
          align="right"
          trigger={
            <button
              onClick={() => toggleDropdown('saved')}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <BookmarkIcon className="h-4 w-4" />
              Saved
              {savedFilters.length > 0 && (
                <span className="text-xs">({savedFilters.length})</span>
              )}
            </button>
          }
        >
          <div className="py-1">
            {/* Save current filter */}
            {hasActiveFilters && onSaveFilter && (
              <>
                <div className="px-3 py-2">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="Filter name..."
                      value={saveFilterName}
                      onChange={(e) => setSaveFilterName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveFilter()}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
                    />
                    <button
                      onClick={handleSaveFilter}
                      disabled={!saveFilterName.trim()}
                      className="px-2 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
                <div className="h-px bg-gray-200 dark:bg-gray-700" />
              </>
            )}
            {/* Saved filter list */}
            {savedFilters.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                No saved filters
              </div>
            ) : (
              savedFilters.map((sf) => (
                <div
                  key={sf.id}
                  className="flex items-center gap-1 px-3 py-2 hover:bg-accent"
                >
                  <button
                    onClick={() => {
                      onLoadFilter?.(sf)
                      closeDropdown()
                    }}
                    className="flex-1 text-left text-sm text-gray-700 dark:text-gray-300"
                  >
                    {sf.name}
                  </button>
                  <button
                    onClick={() => onDeleteFilter?.(sf.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <TrashIcon className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Dropdown>
      )}

      {/* Clear All */}
      {hasActiveFilters && (
        <button
          onClick={onClearFilters}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
        >
          <CloseIcon className="h-3 w-3" />
          Clear all
        </button>
      )}
    </div>
  )
}

export default FilterBar
