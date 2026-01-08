/*
 * Member Filters Component
 * Version: 1.0.0
 *
 * Filter and sort controls for workspace member list.
 * Features: Search, role filter, and sort options.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Task: 261 - Member list - Search, filter, sort
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-03
 * =============================================================================
 */

import { Input } from '../ui/input'

// =============================================================================
// Types
// =============================================================================

export type MemberRole = 'SYSTEM' | 'ADMIN' | 'MEMBER' | 'VIEWER' | 'ALL'
export type SortField = 'name' | 'email' | 'role' | 'joinedAt'
export type SortOrder = 'asc' | 'desc'

export interface MemberFiltersState {
  search: string
  role: MemberRole
  sortField: SortField
  sortOrder: SortOrder
}

interface MemberFiltersProps {
  filters: MemberFiltersState
  onFiltersChange: (filters: MemberFiltersState) => void
  totalCount: number
  filteredCount: number
}

// =============================================================================
// Icons
// =============================================================================

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
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

function SortAscIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
      />
    </svg>
  )
}

function SortDescIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
      />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function MemberFilters({
  filters,
  onFiltersChange,
  totalCount,
  filteredCount,
}: MemberFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value })
  }

  const handleRoleChange = (value: string) => {
    onFiltersChange({ ...filters, role: value as MemberRole })
  }

  const handleSortFieldChange = (value: string) => {
    onFiltersChange({ ...filters, sortField: value as SortField })
  }

  const toggleSortOrder = () => {
    onFiltersChange({
      ...filters,
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
    })
  }

  const showingFiltered = filteredCount !== totalCount

  return (
    <div className="space-y-3">
      {/* Search and Filters Row */}
      <div className="flex flex-wrap gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Role Filter */}
        <select
          value={filters.role}
          onChange={(e) => handleRoleChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="ALL">All roles</option>
          <option value="SYSTEM">System</option>
          <option value="ADMIN">Admin</option>
          <option value="MEMBER">Member</option>
          <option value="VIEWER">Viewer</option>
        </select>

        {/* Sort Field */}
        <select
          value={filters.sortField}
          onChange={(e) => handleSortFieldChange(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="name">Sort by name</option>
          <option value="email">Sort by email</option>
          <option value="role">Sort by role</option>
          <option value="joinedAt">Sort by join date</option>
        </select>

        {/* Sort Order Toggle */}
        <button
          onClick={toggleSortOrder}
          className="h-10 w-10 rounded-md border border-input bg-background flex items-center justify-center hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          title={filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          {filters.sortOrder === 'asc' ? (
            <SortAscIcon className="h-4 w-4" />
          ) : (
            <SortDescIcon className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Results Count */}
      {showingFiltered && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalCount} members
        </p>
      )}
    </div>
  )
}

// =============================================================================
// Filter/Sort Utilities
// =============================================================================

interface Member {
  id: number
  name: string | null
  email: string
  role: string
  joinedAt?: string | Date
  source?: 'workspace_user' | 'group' | 'both' | 'acl'
}

export function filterMembers(
  members: Member[],
  filters: MemberFiltersState
): Member[] {
  return members.filter((member) => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const nameMatch = member.name?.toLowerCase().includes(searchLower)
      const emailMatch = member.email.toLowerCase().includes(searchLower)
      if (!nameMatch && !emailMatch) {
        return false
      }
    }

    // Role filter
    if (filters.role !== 'ALL' && member.role !== filters.role) {
      return false
    }

    return true
  })
}

export function sortMembers(
  members: Member[],
  sortField: SortField,
  sortOrder: SortOrder
): Member[] {
  const roleOrder = ['SYSTEM', 'ADMIN', 'MEMBER', 'VIEWER']

  return [...members].sort((a, b) => {
    let comparison = 0

    switch (sortField) {
      case 'name':
        comparison = (a.name ?? '').localeCompare(b.name ?? '')
        break
      case 'email':
        comparison = a.email.localeCompare(b.email)
        break
      case 'role':
        comparison = roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role)
        break
      case 'joinedAt':
        const dateA = a.joinedAt ? new Date(a.joinedAt).getTime() : 0
        const dateB = b.joinedAt ? new Date(b.joinedAt).getTime() : 0
        comparison = dateA - dateB
        break
    }

    return sortOrder === 'asc' ? comparison : -comparison
  })
}

export function filterAndSortMembers(
  members: Member[],
  filters: MemberFiltersState
): Member[] {
  const filtered = filterMembers(members, filters)
  return sortMembers(filtered, filters.sortField, filters.sortOrder)
}

// =============================================================================
// Pagination Utilities
// =============================================================================

export interface PaginationState {
  page: number
  pageSize: number
}

export function paginateMembers<T>(
  items: T[],
  pagination: PaginationState
): T[] {
  const start = (pagination.page - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return items.slice(start, end)
}

export function getTotalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize)
}
