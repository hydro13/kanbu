/*
 * PermissionMatrixPage Component
 * Version: 1.0.0
 *
 * Grid view of principals (users/groups) × resources showing effective permissions.
 * Provides a high-level overview of who has access to what.
 *
 * Features:
 * - Grid/matrix view with principals as rows, resources as columns
 * - Color coding: green=allow, red=deny, gray=none, blue=inherited
 * - Filter by resource type, workspace, principal type
 * - Click cell for detailed breakdown
 * - Export to CSV/JSON
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 9.5 - Advanced ACL UI
 * =============================================================================
 */

import { useState, useMemo } from 'react'
import { AdminLayout } from '@/components/admin'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

type ResourceTypeFilter = 'all' | 'workspace' | 'project' | 'admin' | 'system'
type PrincipalTypeFilter = 'all' | 'user' | 'group'

// Types matching backend response
interface MatrixPrincipal {
  type: 'user' | 'group'
  id: number
  name: string
  displayName: string
}

interface MatrixResource {
  type: string
  id: number | null
  name: string
  path: string
}

interface MatrixCell {
  principalType: string
  principalId: number
  resourceType: string
  resourceId: number | null
  effectivePermissions: number
  isDirect: boolean
  isDenied: boolean
  inheritedFrom?: string
}

interface CellDetailPopup {
  principalType: 'user' | 'group'
  principalId: number
  principalName: string
  resourceType: string
  resourceId: number | null
  resourceName: string
  effectivePermissions: number
  isDirect: boolean
  isDenied: boolean
  inheritedFrom?: string | null
}

// =============================================================================
// Permission Helpers
// =============================================================================

const PERMISSION_BITS = {
  READ: 1,
  WRITE: 2,
  EXECUTE: 4,
  DELETE: 8,
  PERMISSIONS: 16,
} as const

const PRESETS: Record<number, string> = {
  0: 'None',
  1: 'Read Only',
  7: 'Contributor',
  15: 'Editor',
  31: 'Full Control',
}

function getPresetName(permissions: number): string {
  return PRESETS[permissions] || `Custom (${permissions})`
}

function formatPermissionBits(permissions: number): string {
  const bits = []
  if (permissions & PERMISSION_BITS.READ) bits.push('R')
  if (permissions & PERMISSION_BITS.WRITE) bits.push('W')
  if (permissions & PERMISSION_BITS.EXECUTE) bits.push('X')
  if (permissions & PERMISSION_BITS.DELETE) bits.push('D')
  if (permissions & PERMISSION_BITS.PERMISSIONS) bits.push('P')
  return bits.length > 0 ? bits.join('') : '-----'
}

// =============================================================================
// Icons
// =============================================================================

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function PermissionMatrixPage() {
  // Filters
  const [resourceTypeFilter, setResourceTypeFilter] = useState<ResourceTypeFilter>('all')
  const [principalTypeFilter, setPrincipalTypeFilter] = useState<PrincipalTypeFilter>('all')
  const [workspaceFilter, setWorkspaceFilter] = useState<number | null>(null)
  const [includeInherited, setIncludeInherited] = useState(true)

  // Cell detail popup
  const [selectedCell, setSelectedCell] = useState<CellDetailPopup | null>(null)

  // Fetch workspaces for filter dropdown
  const { data: workspacesData } = trpc.admin.listAllWorkspaces.useQuery({
    limit: 100,
    isActive: true,
  })

  // Build query input
  const queryInput = useMemo(() => ({
    resourceTypes: resourceTypeFilter === 'all' ? undefined : [resourceTypeFilter],
    workspaceId: workspaceFilter ?? undefined,
    includeInherited,
    principalTypes: principalTypeFilter === 'all' ? undefined : [principalTypeFilter as 'user' | 'group'],
    limit: 50,
    offset: 0,
  }), [resourceTypeFilter, workspaceFilter, includeInherited, principalTypeFilter])

  // Fetch matrix data
  const { data: matrixData, isLoading, error } = trpc.acl.getPermissionMatrix.useQuery(queryInput)

  // Get cell data by principal and resource
  const getCellData = (principalType: string, principalId: number, resourceType: string, resourceId: number | null): MatrixCell | undefined => {
    const cell = matrixData?.cells.find(
      c => c.principalType === principalType &&
           c.principalId === principalId &&
           c.resourceType === resourceType &&
           c.resourceId === resourceId
    )
    return cell as MatrixCell | undefined
  }

  // Get cell color based on permissions
  const getCellColor = (cell: MatrixCell | undefined) => {
    if (!cell || cell.effectivePermissions === 0) {
      return 'bg-gray-50 dark:bg-gray-900 text-gray-400'
    }
    if (cell.isDenied) {
      return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
    }
    if (!cell.isDirect) {
      return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
    }
    return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
  }

  // Handle cell click
  const handleCellClick = (
    principal: MatrixPrincipal,
    resource: MatrixResource
  ) => {
    const cell = getCellData(principal.type, principal.id, resource.type, resource.id)
    setSelectedCell({
      principalType: principal.type,
      principalId: principal.id,
      principalName: principal.displayName,
      resourceType: resource.type,
      resourceId: resource.id,
      resourceName: resource.name,
      effectivePermissions: cell?.effectivePermissions ?? 0,
      isDirect: cell?.isDirect ?? false,
      isDenied: cell?.isDenied ?? false,
      inheritedFrom: cell?.inheritedFrom,
    })
  }

  // Export CSV
  const handleExportCsv = () => {
    if (!matrixData) return

    const headers = ['Principal Type', 'Principal Name', ...matrixData.resources.map(r => r.name)]
    const rows = matrixData.principals.map(principal => {
      const cells = matrixData.resources.map(resource => {
        const cell = getCellData(principal.type, principal.id, resource.type, resource.id)
        return cell ? formatPermissionBits(cell.effectivePermissions) : '-----'
      })
      return [principal.type, principal.displayName, ...cells]
    })

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `permission-matrix-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminLayout
      title="Permission Matrix"
      description="Grid view of principals and resources showing effective permissions"
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-card rounded-card border border-border p-3">
          <FilterIcon className="w-4 h-4 text-gray-400" />

          {/* Resource Type Filter */}
          <select
            value={resourceTypeFilter}
            onChange={(e) => setResourceTypeFilter(e.target.value as ResourceTypeFilter)}
            className="px-2 py-1.5 text-sm border border-input rounded bg-background text-gray-900 dark:text-white"
          >
            <option value="all">All Resource Types</option>
            <option value="workspace">Workspaces</option>
            <option value="project">Projects</option>
            <option value="admin">Admin</option>
            <option value="system">System</option>
          </select>

          {/* Workspace Filter */}
          <select
            value={workspaceFilter ?? ''}
            onChange={(e) => setWorkspaceFilter(e.target.value ? Number(e.target.value) : null)}
            className="px-2 py-1.5 text-sm border border-input rounded bg-background text-gray-900 dark:text-white"
          >
            <option value="">All Workspaces</option>
            {workspacesData?.workspaces.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>

          {/* Principal Type Filter */}
          <select
            value={principalTypeFilter}
            onChange={(e) => setPrincipalTypeFilter(e.target.value as PrincipalTypeFilter)}
            className="px-2 py-1.5 text-sm border border-input rounded bg-background text-gray-900 dark:text-white"
          >
            <option value="all">All Principals</option>
            <option value="user">Users Only</option>
            <option value="group">Groups Only</option>
          </select>

          {/* Include Inherited Toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={includeInherited}
              onChange={(e) => setIncludeInherited(e.target.checked)}
              className="rounded border-gray-300 text-blue-600"
            />
            Include inherited
          </label>

          <div className="flex-1" />

          {/* Export Button */}
          <button
            onClick={handleExportCsv}
            disabled={!matrixData || matrixData.principals.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300 disabled:opacity-50"
          >
            <DownloadIcon className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" />
            Direct Allow
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" />
            Inherited
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800" />
            Denied
          </span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700" />
            No Access
          </span>
        </div>

        {/* Matrix Table */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading permission matrix...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">Error loading matrix: {error.message}</div>
        ) : !matrixData || matrixData.principals.length === 0 || matrixData.resources.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No data to display. Try adjusting the filters.
          </div>
        ) : (
          <div className="bg-card rounded-card border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                {/* Header */}
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700">
                      Principal
                    </th>
                    {matrixData.resources.map((resource) => (
                      <th
                        key={`${resource.type}-${resource.id}`}
                        className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                        title={resource.path}
                      >
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-[10px] text-gray-400">{resource.type}</span>
                          <span className="truncate max-w-[100px]">{resource.name}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Body */}
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {matrixData.principals.map((principal) => (
                    <tr key={`${principal.type}-${principal.id}`} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      {/* Principal Name */}
                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-2 text-sm border-r border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          {principal.type === 'user' ? (
                            <UserIcon className="w-4 h-4 text-gray-400" />
                          ) : (
                            <UsersIcon className="w-4 h-4 text-indigo-400" />
                          )}
                          <span className="font-medium text-gray-900 dark:text-white truncate max-w-[150px]" title={principal.displayName}>
                            {principal.displayName}
                          </span>
                          <span className="text-xs text-gray-400">{principal.name}</span>
                        </div>
                      </td>

                      {/* Permission Cells */}
                      {matrixData.resources.map((resource) => {
                        const cell = getCellData(principal.type, principal.id, resource.type, resource.id)
                        const colorClass = getCellColor(cell)

                        return (
                          <td
                            key={`${resource.type}-${resource.id}`}
                            className={cn(
                              'px-2 py-2 text-center text-xs cursor-pointer transition-colors',
                              colorClass,
                              'hover:ring-2 hover:ring-blue-500 hover:ring-inset'
                            )}
                            onClick={() => handleCellClick(principal, resource)}
                            title={cell ? `${getPresetName(cell.effectivePermissions)} - Click for details` : 'No access'}
                          >
                            <span className="font-mono">
                              {cell ? formatPermissionBits(cell.effectivePermissions) : '-----'}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
              Showing {matrixData.principals.length} of {matrixData.totals.principals} principals,{' '}
              {matrixData.resources.length} of {matrixData.totals.resources} resources
            </div>
          </div>
        )}

        {/* Cell Detail Popup */}
        {selectedCell && (
          <CellDetailDialog cell={selectedCell} onClose={() => setSelectedCell(null)} />
        )}
      </div>
    </AdminLayout>
  )
}

// =============================================================================
// Cell Detail Dialog
// =============================================================================

function CellDetailDialog({
  cell,
  onClose,
}: {
  cell: CellDetailPopup
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Permission Details</h3>
            <p className="text-xs text-gray-500 mt-0.5">{cell.principalName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          {/* Resource Info */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Resource</label>
            <p className="text-sm text-gray-900 dark:text-white">
              {cell.resourceType}: {cell.resourceName}
            </p>
          </div>

          {/* Effective Permissions */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Effective Permissions</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-lg font-bold text-gray-900 dark:text-white">
                {formatPermissionBits(cell.effectivePermissions)}
              </span>
              <span className="text-sm text-gray-500">
                = {getPresetName(cell.effectivePermissions)}
              </span>
            </div>
          </div>

          {/* Permission Breakdown */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Breakdown</label>
            <div className="grid grid-cols-5 gap-2 mt-2">
              {Object.entries(PERMISSION_BITS).map(([name, bit]) => {
                const hasPermission = (cell.effectivePermissions & bit) !== 0
                return (
                  <div
                    key={name}
                    className={cn(
                      'text-center py-2 rounded text-xs font-medium',
                      hasPermission
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
                    )}
                  >
                    {name.charAt(0)}
                    <div className="text-[10px] font-normal">{name.toLowerCase()}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Source */}
          <div className="flex gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Source</label>
              <p className="text-sm text-gray-900 dark:text-white">
                {cell.isDirect ? 'Direct entry' : cell.inheritedFrom ? `Inherited from ${cell.inheritedFrom}` : 'Inherited'}
              </p>
            </div>
            {cell.isDenied && (
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Status</label>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">Has deny entries</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default PermissionMatrixPage
