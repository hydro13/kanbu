/*
 * Wiki Version History Component
 * Version: 1.0.0
 *
 * Modal component for viewing and restoring wiki page versions.
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (Fase 7)
 * ===================================================================
 */

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { RichTextEditor } from '@/components/editor'
import { trpc } from '@/lib/trpc'
import {
  History,
  RotateCcw,
  Eye,
  User,
  Clock,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface WikiVersionHistoryProps {
  /** Page ID to show versions for */
  pageId: number
  /** Current page title (for display) */
  pageTitle: string
  /** Whether the modal is open */
  open: boolean
  /** Close handler */
  onClose: () => void
  /** Callback when a version is restored */
  onRestored?: () => void
}

interface VersionSummary {
  id: number
  version: number
  title: string
  changeNote: string | null
  createdById: number
  createdAt: string
  createdBy: {
    name: string
    username: string
  }
}

// =============================================================================
// Main Component
// =============================================================================

export function WikiVersionHistory({
  pageId,
  pageTitle,
  open,
  onClose,
  onRestored,
}: WikiVersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)

  const utils = trpc.useUtils()

  // Fetch version list
  const versionsQuery = trpc.workspaceWiki.getVersions.useQuery(
    { pageId, limit: 20 },
    { enabled: open }
  )
  const versions = (versionsQuery.data ?? []) as VersionSummary[]

  // Fetch selected version content
  const versionDetailQuery = trpc.workspaceWiki.getVersion.useQuery(
    { pageId, version: selectedVersion! },
    { enabled: selectedVersion !== null }
  )

  // Restore mutation
  const restoreMutation = trpc.workspaceWiki.restoreVersion.useMutation({
    onSuccess: () => {
      utils.workspaceWiki.getBySlug.invalidate()
      utils.workspaceWiki.get.invalidate()
      utils.workspaceWiki.getVersions.invalidate()
      setShowRestoreConfirm(false)
      setSelectedVersion(null)
      onRestored?.()
      onClose()
    },
  })

  // Handle restore
  const handleRestore = () => {
    if (selectedVersion === null) return
    restoreMutation.mutate({
      pageId,
      version: selectedVersion,
      changeNote: `Restored from version ${selectedVersion}`,
    })
  }

  // Format relative time
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
    }
    if (diffDays === 1) return 'yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
          <DialogDescription>
            {pageTitle} - {versions.length} version{versions.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex min-h-0 gap-4">
          {/* Version List */}
          <div className="w-64 flex-shrink-0 border-r pr-4">
            <ScrollArea className="h-[50vh]">
              {versionsQuery.isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No version history</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {versions.map((version, index) => (
                    <button
                      key={version.id}
                      onClick={() => setSelectedVersion(version.version)}
                      className={cn(
                        'w-full text-left p-3 rounded-lg transition-colors',
                        selectedVersion === version.version
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          v{version.version}
                          {index === 0 && (
                            <span className="ml-2 text-xs opacity-70">(current)</span>
                          )}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'text-xs',
                          selectedVersion === version.version
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        )}
                      >
                        <div className="flex items-center gap-1 mb-0.5">
                          <User className="h-3 w-3" />
                          {version.createdBy.name}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(version.createdAt)}
                        </div>
                      </div>
                      {version.changeNote && (
                        <p
                          className={cn(
                            'text-xs mt-1 truncate',
                            selectedVersion === version.version
                              ? 'text-primary-foreground/80'
                              : 'text-muted-foreground'
                          )}
                        >
                          "{version.changeNote}"
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Version Preview */}
          <div className="flex-1 min-w-0">
            {selectedVersion === null ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Eye className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a version to preview</p>
                </div>
              </div>
            ) : versionDetailQuery.isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-6 w-48 bg-muted rounded" />
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-3/4 bg-muted rounded" />
              </div>
            ) : versionDetailQuery.data ? (
              <div className="h-full flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{versionDetailQuery.data.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Version {selectedVersion} •{' '}
                      {new Date(versionDetailQuery.data.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {/* Don't show restore for current version (first in list) */}
                  {versions[0]?.version !== selectedVersion && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRestoreConfirm(true)}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>
                  )}
                </div>
                <div className="flex-1 border rounded-lg overflow-hidden">
                  <RichTextEditor
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    initialContent={(() => {
                      const contentJson = (versionDetailQuery.data as any).contentJson
                      if (typeof contentJson === 'string') return contentJson
                      return contentJson ? JSON.stringify(contentJson) : undefined
                    })()}
                    readOnly
                    showToolbar={false}
                    minHeight="200px"
                    maxHeight="400px"
                    namespace={`version-preview-${selectedVersion}`}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>

        {/* Restore Confirmation Dialog */}
        <Dialog open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Restore Version?</DialogTitle>
              <DialogDescription>
                Are you sure you want to restore version {selectedVersion}? This will create a new
                version with the content from version {selectedVersion}. The current content will be
                preserved in the version history.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRestoreConfirm(false)}>
                Cancel
              </Button>
              <Button onClick={handleRestore} disabled={restoreMutation.isPending}>
                <RotateCcw className="h-4 w-4 mr-1" />
                {restoreMutation.isPending ? 'Restoring...' : 'Restore Version'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

export default WikiVersionHistory
