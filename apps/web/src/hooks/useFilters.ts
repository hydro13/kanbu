/*
 * useFilters Hook
 * Version: 1.0.0
 *
 * Filter state management with URL synchronization for shareable filter links.
 * Supports all task filter parameters including tags, priority, assignee, dates.
 *
 * ═══════════════════════════════════════════════════════════════════
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Session: 7c701d22-6809-48b2-a804-ca43c4979b87
 * Claude Code: v2.0.70 (Opus 4.5)
 * Host: linux-dev
 * Signed: 2025-12-28T22:45 CET
 * ═══════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

// =============================================================================
// Types
// =============================================================================

export interface FilterState {
  // Text search
  search: string
  // Priority filter (0-3)
  priority: number | null
  // Assignee filter
  assigneeId: number | null
  // Tag filter (multiple)
  tagIds: number[]
  // Category filter
  categoryId: number | null
  // Column filter
  columnId: number | null
  // Due date range
  dueDateFrom: string | null
  dueDateTo: string | null
  // Include closed tasks
  includeCompleted: boolean
}

export interface QuickFilter {
  id: string
  label: string
  icon?: string
  filter: Partial<FilterState>
}

export interface SavedFilter {
  id: string
  name: string
  filter: FilterState
  createdAt: string
}

export interface UseFiltersResult {
  // Current filter state
  filters: FilterState
  // Check if any filters are active
  hasActiveFilters: boolean
  // Number of active filters
  activeFilterCount: number
  // Update individual filter
  setFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  // Update multiple filters at once
  setFilters: (filters: Partial<FilterState>) => void
  // Clear all filters
  clearFilters: () => void
  // Clear specific filter
  clearFilter: (key: keyof FilterState) => void
  // Toggle tag in filter
  toggleTag: (tagId: number) => void
  // Apply quick filter
  applyQuickFilter: (quickFilter: QuickFilter) => void
  // Saved filters
  savedFilters: SavedFilter[]
  saveFilter: (name: string) => void
  loadFilter: (filter: SavedFilter) => void
  deleteFilter: (id: string) => void
  // URL sync status
  isUrlSynced: boolean
}

// =============================================================================
// Default Values
// =============================================================================

const defaultFilters: FilterState = {
  search: '',
  priority: null,
  assigneeId: null,
  tagIds: [],
  categoryId: null,
  columnId: null,
  dueDateFrom: null,
  dueDateTo: null,
  includeCompleted: false,
}

// =============================================================================
// URL Parameter Helpers
// =============================================================================

function filtersToSearchParams(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.search) params.set('q', filters.search)
  if (filters.priority !== null) params.set('priority', String(filters.priority))
  if (filters.assigneeId !== null) params.set('assignee', String(filters.assigneeId))
  if (filters.tagIds.length > 0) params.set('tags', filters.tagIds.join(','))
  if (filters.categoryId !== null) params.set('category', String(filters.categoryId))
  if (filters.columnId !== null) params.set('column', String(filters.columnId))
  if (filters.dueDateFrom) params.set('dueFrom', filters.dueDateFrom)
  if (filters.dueDateTo) params.set('dueTo', filters.dueDateTo)
  if (filters.includeCompleted) params.set('completed', '1')

  return params
}

function searchParamsToFilters(params: URLSearchParams): Partial<FilterState> {
  const filters: Partial<FilterState> = {}

  const q = params.get('q')
  if (q) filters.search = q

  const priority = params.get('priority')
  if (priority) filters.priority = parseInt(priority, 10)

  const assignee = params.get('assignee')
  if (assignee) filters.assigneeId = parseInt(assignee, 10)

  const tags = params.get('tags')
  if (tags) filters.tagIds = tags.split(',').map((id) => parseInt(id, 10))

  const category = params.get('category')
  if (category) filters.categoryId = parseInt(category, 10)

  const column = params.get('column')
  if (column) filters.columnId = parseInt(column, 10)

  const dueFrom = params.get('dueFrom')
  if (dueFrom) filters.dueDateFrom = dueFrom

  const dueTo = params.get('dueTo')
  if (dueTo) filters.dueDateTo = dueTo

  const completed = params.get('completed')
  if (completed === '1') filters.includeCompleted = true

  return filters
}

// =============================================================================
// Local Storage Helpers
// =============================================================================

const SAVED_FILTERS_KEY = 'kanbu:savedFilters'

function loadSavedFiltersFromStorage(projectId: number): SavedFilter[] {
  try {
    const stored = localStorage.getItem(`${SAVED_FILTERS_KEY}:${projectId}`)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveSavedFiltersToStorage(projectId: number, filters: SavedFilter[]): void {
  try {
    localStorage.setItem(`${SAVED_FILTERS_KEY}:${projectId}`, JSON.stringify(filters))
  } catch {
    // Ignore storage errors
  }
}

// =============================================================================
// useFilters Hook
// =============================================================================

export function useFilters(projectId: number, syncToUrl: boolean = true): UseFiltersResult {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFiltersState] = useState<FilterState>(() => {
    // Initialize from URL params if available
    if (syncToUrl) {
      const urlFilters = searchParamsToFilters(searchParams)
      return { ...defaultFilters, ...urlFilters }
    }
    return defaultFilters
  })

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() =>
    loadSavedFiltersFromStorage(projectId)
  )

  // Sync URL when filters change
  useEffect(() => {
    if (!syncToUrl) return

    const newParams = filtersToSearchParams(filters)
    const currentParams = new URLSearchParams(searchParams)

    // Only update if params actually changed
    const newStr = newParams.toString()
    const currentStr = currentParams.toString()

    if (newStr !== currentStr) {
      setSearchParams(newParams, { replace: true })
    }
  }, [filters, syncToUrl, searchParams, setSearchParams])

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.priority !== null) count++
    if (filters.assigneeId !== null) count++
    if (filters.tagIds.length > 0) count++
    if (filters.categoryId !== null) count++
    if (filters.columnId !== null) count++
    if (filters.dueDateFrom || filters.dueDateTo) count++
    if (filters.includeCompleted) count++
    return count
  }, [filters])

  const hasActiveFilters = activeFilterCount > 0

  // Set individual filter
  const setFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFiltersState((prev) => ({ ...prev, [key]: value }))
  }, [])

  // Set multiple filters
  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }))
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters)
  }, [])

  // Clear specific filter
  const clearFilter = useCallback((key: keyof FilterState) => {
    setFiltersState((prev) => ({ ...prev, [key]: defaultFilters[key] }))
  }, [])

  // Toggle tag
  const toggleTag = useCallback((tagId: number) => {
    setFiltersState((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }))
  }, [])

  // Apply quick filter
  const applyQuickFilter = useCallback((quickFilter: QuickFilter) => {
    setFiltersState((prev) => ({ ...prev, ...quickFilter.filter }))
  }, [])

  // Save current filter
  const saveFilter = useCallback(
    (name: string) => {
      const newFilter: SavedFilter = {
        id: Date.now().toString(),
        name,
        filter: { ...filters },
        createdAt: new Date().toISOString(),
      }
      const newSavedFilters = [...savedFilters, newFilter]
      setSavedFilters(newSavedFilters)
      saveSavedFiltersToStorage(projectId, newSavedFilters)
    },
    [filters, savedFilters, projectId]
  )

  // Load saved filter
  const loadFilter = useCallback((filter: SavedFilter) => {
    setFiltersState(filter.filter)
  }, [])

  // Delete saved filter
  const deleteFilter = useCallback(
    (id: string) => {
      const newSavedFilters = savedFilters.filter((f) => f.id !== id)
      setSavedFilters(newSavedFilters)
      saveSavedFiltersToStorage(projectId, newSavedFilters)
    },
    [savedFilters, projectId]
  )

  return {
    filters,
    hasActiveFilters,
    activeFilterCount,
    setFilter,
    setFilters,
    clearFilters,
    clearFilter,
    toggleTag,
    applyQuickFilter,
    savedFilters,
    saveFilter,
    loadFilter,
    deleteFilter,
    isUrlSynced: syncToUrl,
  }
}

// =============================================================================
// Predefined Quick Filters
// =============================================================================

export const defaultQuickFilters: QuickFilter[] = [
  {
    id: 'my-tasks',
    label: 'My Tasks',
    filter: {}, // Will need current user ID at runtime
  },
  {
    id: 'due-today',
    label: 'Due Today',
    filter: {
      dueDateFrom: new Date().toISOString().split('T')[0],
      dueDateTo: new Date().toISOString().split('T')[0],
    },
  },
  {
    id: 'overdue',
    label: 'Overdue',
    filter: {
      dueDateTo: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    },
  },
  {
    id: 'high-priority',
    label: 'High Priority',
    filter: { priority: 2 },
  },
  {
    id: 'urgent',
    label: 'Urgent',
    filter: { priority: 3 },
  },
]

export default useFilters
