/*
 * BackupPage
 * Version: 1.2.0
 *
 * Admin page for database and source code backup management.
 * Saves backups to Google Drive.
 *
 * Updated: 2026-01-06 - Added source code backup functionality
 */

import { useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Component
// =============================================================================

interface LastDbBackupInfo {
  timestamp: string
  fileName: string
  fileSizeKB: number
  backupsKept: number
}

interface LastSourceBackupInfo {
  timestamp: string
  fileName: string
  fileSizeMB: number
  backupsKept: number
  instructions: string[]
}

export function BackupPage() {
  const [lastDbBackup, setLastDbBackup] = useState<LastDbBackupInfo | null>(null)
  const [lastSourceBackup, setLastSourceBackup] = useState<LastSourceBackupInfo | null>(null)

  const createBackup = trpc.admin.createBackup.useMutation({
    onSuccess: (data) => {
      setLastDbBackup({
        timestamp: new Date().toISOString(),
        fileName: data.fileName,
        fileSizeKB: data.fileSizeKB,
        backupsKept: data.backupsKept,
      })
    },
  })

  const createSourceBackup = trpc.admin.createSourceBackup.useMutation({
    onSuccess: (data) => {
      setLastSourceBackup({
        timestamp: new Date().toISOString(),
        fileName: data.fileName,
        fileSizeMB: data.fileSizeMB,
        backupsKept: data.backupsKept,
        instructions: data.instructions,
      })
    },
  })

  return (
    <AdminLayout title="Backup" description="Database and source code backups to Google Drive">
      <div className="space-y-4">
        {/* Database Backup Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Database Backup</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a PostgreSQL dump and save to Google Drive
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Database Dump</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Creates a full PostgreSQL backup of all data.
                  Stored in <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">max-backups/kanbu_backup_*.sql</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => createBackup.mutate()}
                disabled={createBackup.isPending}
              >
                {createBackup.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating backup...
                  </>
                ) : (
                  'Create Database Backup'
                )}
              </Button>

              {createBackup.isSuccess && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  Database backup created!
                </span>
              )}

              {createBackup.isError && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  {createBackup.error.message}
                </span>
              )}
            </div>

            {/* Last DB Backup Info */}
            {lastDbBackup && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File:</span>
                    <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      {lastDbBackup.fileName}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{lastDbBackup.fileSizeKB} KB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kept:</span>
                    <span>{lastDbBackup.backupsKept} / 10</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Source Code Backup Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Source Code Backup</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Create a full source code archive for deployment on another machine
            </p>
          </div>
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white">Full Source Archive</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Creates a tar.gz with all source code, configs, and Docker files.
                  Excludes node_modules, .git, and build artifacts for clean deployment.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => createSourceBackup.mutate()}
                disabled={createSourceBackup.isPending}
                variant="outline"
              >
                {createSourceBackup.isPending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating archive...
                  </>
                ) : (
                  'Create Source Backup'
                )}
              </Button>

              {createSourceBackup.isSuccess && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  Source backup created!
                </span>
              )}

              {createSourceBackup.isError && (
                <span className="text-sm text-red-600 dark:text-red-400">
                  {createSourceBackup.error.message}
                </span>
              )}
            </div>

            {/* Last Source Backup Info */}
            {lastSourceBackup && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File:</span>
                    <code className="text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                      {lastSourceBackup.fileName}
                    </code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size:</span>
                    <span>{lastSourceBackup.fileSizeMB} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kept:</span>
                    <span>{lastSourceBackup.backupsKept} / 5</span>
                  </div>
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Deployment instructions:</p>
                  <ol className="text-xs text-muted-foreground space-y-1">
                    {lastSourceBackup.instructions.map((step, i) => (
                      <li key={i} className="font-mono">{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800 p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-medium">Backup Retention</p>
              <p className="mt-1 text-amber-700 dark:text-amber-300">
                Database backups: 10 most recent kept. Source backups: 5 most recent kept.
                For a full restore, you need both a database backup and a source backup.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default BackupPage
