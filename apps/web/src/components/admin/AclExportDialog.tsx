/*
 * AclExportDialog Component
 * Version: 1.0.0
 *
 * Export ACL configuration to JSON or CSV format for backup/migration.
 *
 * Features:
 * - Scope selection (all, workspace, project)
 * - Format selection (JSON, CSV)
 * - Include children toggle
 * - Download file
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 9.5 - Advanced ACL UI
 * =============================================================================
 */

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

export interface AclExportDialogProps {
  isOpen: boolean
  onClose: () => void
}

type ExportFormat = 'json' | 'csv'
type ResourceScope = 'all' | 'workspace' | 'project'

// =============================================================================
// Icons
// =============================================================================

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

// =============================================================================
// Component
// =============================================================================

export function AclExportDialog({
  isOpen,
  onClose,
}: AclExportDialogProps) {
  // Form state
  const [scope, setScope] = useState<ResourceScope>('all')
  const [resourceId, setResourceId] = useState<number | null>(null)
  const [format, setFormat] = useState<ExportFormat>('json')
  const [includeChildren, setIncludeChildren] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  // Fetch workspaces for scope selector
  const { data: workspacesData } = trpc.admin.listAllWorkspaces.useQuery(
    { limit: 100, isActive: true },
    { enabled: isOpen }
  )

  // Export query - we'll trigger it manually
  const exportQuery = trpc.acl.exportAcl.useQuery(
    {
      resourceType: scope === 'all' ? undefined : scope,
      resourceId: scope === 'all' ? undefined : resourceId,
      format,
      includeChildren,
    },
    { enabled: false }
  )

  // Handle export
  const handleExport = async () => {
    setIsExporting(true)
    try {
      const result = await exportQuery.refetch()
      if (result.data) {
        // Determine file extension and MIME type
        const extension = format === 'json' ? 'json' : 'csv'
        const mimeType = format === 'json' ? 'application/json' : 'text/csv'

        // Create download
        const blob = new Blob([result.data.data], { type: mimeType })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `acl-export-${new Date().toISOString().split('T')[0]}.${extension}`
        a.click()
        URL.revokeObjectURL(url)

        onClose()
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <DocumentIcon className="w-5 h-5 text-green-500" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Export ACL Configuration</h3>
              <p className="text-xs text-gray-500">Download ACL entries as JSON or CSV</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded"
          >
            <XIcon className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-4 space-y-4">
          {/* Scope Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Scope</label>
            <select
              value={scope}
              onChange={(e) => {
                setScope(e.target.value as ResourceScope)
                setResourceId(null)
              }}
              className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background text-foreground"
            >
              <option value="all">All ACL Entries</option>
              <option value="workspace">Specific Workspace</option>
              <option value="project">Specific Project</option>
            </select>
          </div>

          {/* Resource ID Selection */}
          {scope !== 'all' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {scope === 'workspace' ? 'Workspace' : 'Project'}
              </label>
              <select
                value={resourceId ?? ''}
                onChange={(e) => setResourceId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-2 py-1.5 text-sm border border-input rounded bg-background text-foreground"
              >
                <option value="">Select...</option>
                {workspacesData?.workspaces.map(ws => (
                  <option key={ws.id} value={ws.id}>{ws.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Format Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setFormat('json')}
                className={cn(
                  'flex-1 py-2 text-sm rounded border',
                  format === 'json'
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-input text-gray-600 dark:text-gray-400'
                )}
              >
                JSON
                <span className="block text-xs mt-0.5 opacity-70">Full format, for import</span>
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={cn(
                  'flex-1 py-2 text-sm rounded border',
                  format === 'csv'
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-400'
                    : 'bg-gray-50 dark:bg-gray-700 border-input text-gray-600 dark:text-gray-400'
                )}
              >
                CSV
                <span className="block text-xs mt-0.5 opacity-70">Excel compatible</span>
              </button>
            </div>
          </div>

          {/* Include Children Toggle */}
          {scope !== 'all' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                checked={includeChildren}
                onChange={(e) => setIncludeChildren(e.target.checked)}
                className="rounded border-gray-300 text-blue-600"
              />
              Include child resources (projects/features)
            </label>
          )}

          {/* Info */}
          <div className="bg-muted rounded-lg p-3 text-xs text-gray-500">
            <p>
              {format === 'json'
                ? 'JSON export includes full metadata and can be imported back. Perfect for backups and environment migration.'
                : 'CSV export is spreadsheet-friendly and easy to review. Includes human-readable permission names.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-700 dark:text-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || (scope !== 'all' && resourceId === null)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded disabled:cursor-not-allowed"
          >
            <DownloadIcon className="w-4 h-4" />
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AclExportDialog
