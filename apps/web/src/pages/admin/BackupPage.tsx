/*
 * BackupPage
 * Version: 3.0.0
 *
 * Admin page for database and source code backup management.
 * Phase 3: Automated backups with scheduling, retention, notifications, and restore.
 *
 * Sections:
 * - System Status: Storage and PostgreSQL configuration
 * - Schedule Management: Create, edit, toggle, and run scheduled backups
 * - Manual Backups: One-click database and source code backups
 * - Execution History: Recent backup executions with status
 * - Notification Settings: In-app and webhook notifications
 * - Database Restore: Restore from backup with safety checks
 */

import { useState } from 'react'
import { AdminLayout } from '../../components/admin/AdminLayout'
import { Button } from '../../components/ui/button'
import { trpc } from '../../lib/trpc'

// =============================================================================
// Types
// =============================================================================

interface LastDbBackupInfo {
  timestamp: string
  fileName: string
  fileSizeKB?: number
  totalBackups: number
}

interface LastSourceBackupInfo {
  timestamp: string
  fileName: string
  fileSizeMB?: number
  totalBackups: number
  instructions?: string[]
}

interface ScheduleFormData {
  name: string
  type: 'DATABASE' | 'SOURCE'
  cronExpression: string
  enabled: boolean
  retentionDays: number
  keepDaily: number
  keepWeekly: number
  keepMonthly: number
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(ms: number | null): string {
  if (!ms) return '-'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
      return 'bg-success'
    case 'RUNNING':
      return 'bg-warning'
    case 'FAILED':
      return 'bg-error'
    default:
      return 'bg-muted'
  }
}

function getTriggerLabel(trigger: string): string {
  switch (trigger) {
    case 'SCHEDULED':
      return 'Scheduled'
    case 'MANUAL':
      return 'Manual'
    case 'EXTERNAL':
      return 'External'
    default:
      return trigger
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

// =============================================================================
// Main Component
// =============================================================================

export function BackupPage() {
  const [lastDbBackup, setLastDbBackup] = useState<LastDbBackupInfo | null>(null)
  const [lastSourceBackup, setLastSourceBackup] = useState<LastSourceBackupInfo | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<number | null>(null)
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormData>({
    name: '',
    type: 'DATABASE',
    cronExpression: '0 2 * * *',
    enabled: true,
    retentionDays: 30,
    keepDaily: 7,
    keepWeekly: 4,
    keepMonthly: 3,
  })
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null)
  const [restoreStep, setRestoreStep] = useState<'select' | 'confirm' | 'warning'>('select')

  // Queries
  const backupStatus = trpc.admin.getBackupStatus.useQuery()
  const backupList = trpc.admin.listBackups.useQuery()
  const schedulerStatus = trpc.admin.getSchedulerStatus.useQuery()
  const scheduleList = trpc.admin.listBackupSchedules.useQuery()
  const executionHistory = trpc.admin.getExecutionHistory.useQuery({ limit: 20 })
  const notificationConfig = trpc.admin.getNotificationConfig.useQuery()
  const restorableBackups = trpc.admin.getRestorableBackups.useQuery()
  const verificationStats = trpc.admin.getVerificationStats.useQuery()

  // Mutations
  const createBackup = trpc.admin.createBackup.useMutation({
    onSuccess: (data) => {
      setLastDbBackup({
        timestamp: new Date().toISOString(),
        fileName: data.fileName,
        fileSizeKB: data.fileSizeKB,
        totalBackups: data.totalBackups,
      })
      backupList.refetch()
      backupStatus.refetch()
      executionHistory.refetch()
    },
  })

  const createSourceBackup = trpc.admin.createSourceBackup.useMutation({
    onSuccess: (data) => {
      setLastSourceBackup({
        timestamp: new Date().toISOString(),
        fileName: data.fileName,
        fileSizeMB: data.fileSizeMB,
        totalBackups: data.totalBackups,
        instructions: data.instructions,
      })
      backupList.refetch()
      backupStatus.refetch()
      executionHistory.refetch()
    },
  })

  const deleteBackup = trpc.admin.deleteBackup.useMutation({
    onSuccess: () => {
      setDeleteConfirm(null)
      backupList.refetch()
      backupStatus.refetch()
    },
  })

  const downloadBackup = trpc.admin.downloadBackup.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/octet-stream' })

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = data.filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
  })

  // Schedule mutations
  const createSchedule = trpc.admin.createBackupSchedule.useMutation({
    onSuccess: () => {
      setShowScheduleForm(false)
      setScheduleForm({
        name: '',
        type: 'DATABASE',
        cronExpression: '0 2 * * *',
        enabled: true,
        retentionDays: 30,
        keepDaily: 7,
        keepWeekly: 4,
        keepMonthly: 3,
      })
      scheduleList.refetch()
      schedulerStatus.refetch()
    },
  })

  const updateSchedule = trpc.admin.updateBackupSchedule.useMutation({
    onSuccess: () => {
      setEditingSchedule(null)
      setShowScheduleForm(false)
      scheduleList.refetch()
      schedulerStatus.refetch()
    },
  })

  const deleteSchedule = trpc.admin.deleteBackupSchedule.useMutation({
    onSuccess: () => {
      scheduleList.refetch()
      schedulerStatus.refetch()
    },
  })

  const runScheduleNow = trpc.admin.runScheduleNow.useMutation({
    onSuccess: () => {
      executionHistory.refetch()
      scheduleList.refetch()
    },
  })

  // Notification mutations
  const updateNotifications = trpc.admin.updateNotificationConfig.useMutation({
    onSuccess: () => {
      notificationConfig.refetch()
    },
  })

  const testWebhook = trpc.admin.testWebhook.useMutation()

  // Restore mutations
  const validateRestore = trpc.admin.validateRestore.useMutation()
  const restoreDatabase = trpc.admin.restoreDatabase.useMutation({
    onSuccess: () => {
      setRestoreConfirm(null)
      setRestoreStep('select')
      executionHistory.refetch()
    },
  })

  // Verification mutations (Phase 4.4)
  const verifyBackup = trpc.admin.verifyBackup.useMutation({
    onSuccess: () => {
      verificationStats.refetch()
      executionHistory.refetch()
    },
  })
  const verifyAllBackups = trpc.admin.verifyAllBackups.useMutation({
    onSuccess: () => {
      verificationStats.refetch()
      executionHistory.refetch()
    },
  })

  // Handlers
  const handleDownload = (filename: string) => {
    downloadBackup.mutate({ filename })
  }

  const handleDelete = (filename: string) => {
    if (deleteConfirm === filename) {
      deleteBackup.mutate({ filename })
    } else {
      setDeleteConfirm(filename)
      setTimeout(() => setDeleteConfirm(null), 3000)
    }
  }

  const handleScheduleSubmit = () => {
    if (editingSchedule) {
      updateSchedule.mutate({
        id: editingSchedule,
        ...scheduleForm,
      })
    } else {
      createSchedule.mutate(scheduleForm)
    }
  }

  const handleEditSchedule = (schedule: {
    id: number
    name: string
    type: string
    cronExpression: string
    enabled: boolean
    retentionDays: number
    keepDaily: number
    keepWeekly: number
    keepMonthly: number
  }) => {
    setEditingSchedule(schedule.id)
    setScheduleForm({
      name: schedule.name,
      type: schedule.type as 'DATABASE' | 'SOURCE',
      cronExpression: schedule.cronExpression,
      enabled: schedule.enabled,
      retentionDays: schedule.retentionDays,
      keepDaily: schedule.keepDaily,
      keepWeekly: schedule.keepWeekly,
      keepMonthly: schedule.keepMonthly,
    })
    setShowScheduleForm(true)
  }

  const handleRestoreClick = async (filename: string) => {
    setRestoreConfirm(filename)
    setRestoreStep('confirm')
    validateRestore.mutate({ filename })
  }

  const handleRestoreConfirm = () => {
    if (restoreConfirm && restoreStep === 'warning') {
      restoreDatabase.mutate({ filename: restoreConfirm, createPreRestoreBackup: true })
    } else if (restoreStep === 'confirm') {
      setRestoreStep('warning')
    }
  }

  return (
    <AdminLayout title="Backup" description="Database and source code backup management">
      <div className="space-y-4">
        {/* System Status Card */}
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">System Status</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Backup storage and scheduler configuration
            </p>
          </div>
          <div className="p-4">
            {backupStatus.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Spinner />
                Loading status...
              </div>
            ) : backupStatus.isError ? (
              <div className="text-destructive text-sm">
                Failed to load status: {backupStatus.error.message}
              </div>
            ) : backupStatus.data ? (
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Storage</div>
                  <div className="text-sm font-medium mt-1 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${backupStatus.data.storageAccessible ? 'bg-success' : 'bg-error'}`} />
                    {backupStatus.data.storageType}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Path</div>
                  <div className="text-sm font-mono mt-1 truncate" title={backupStatus.data.storagePath}>
                    {backupStatus.data.storagePath}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">PostgreSQL</div>
                  <div className="text-sm font-medium mt-1 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${backupStatus.data.postgresContainer.found ? 'bg-success' : 'bg-error'}`} />
                    {backupStatus.data.postgresContainer.name || 'Not found'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Scheduler</div>
                  <div className="text-sm font-medium mt-1 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${schedulerStatus.data?.isRunning ? 'bg-success' : 'bg-muted'}`} />
                    {schedulerStatus.data?.mode || 'loading...'} ({schedulerStatus.data?.activeJobs || 0} jobs)
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Encryption</div>
                  <div className="text-sm font-medium mt-1 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${backupStatus.data.encryption?.enabled ? 'bg-success' : 'bg-muted'}`} />
                    {backupStatus.data.encryption?.enabled ? backupStatus.data.encryption.algorithm : 'Disabled'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Backups</div>
                  <div className="text-sm font-medium mt-1">
                    {backupStatus.data.backupCounts.database} db, {backupStatus.data.backupCounts.source} src
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Verification Stats Card (Phase 4.4) */}
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Backup Verification</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Integrity verification status using SHA-256 checksums
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => verifyAllBackups.mutate()}
              disabled={verifyAllBackups.isPending || (verificationStats.data?.pending === 0)}
            >
              {verifyAllBackups.isPending ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  Verifying...
                </>
              ) : `Verify All Pending (${verificationStats.data?.pending || 0})`}
            </Button>
          </div>
          <div className="p-4">
            {verificationStats.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Spinner />
                Loading stats...
              </div>
            ) : verificationStats.data ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
                  <div className="text-lg font-semibold mt-1">{verificationStats.data.total}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Verified</div>
                  <div className="text-lg font-semibold mt-1 text-success">{verificationStats.data.verified}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Pending</div>
                  <div className="text-lg font-semibold mt-1 text-warning">{verificationStats.data.pending}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Failed</div>
                  <div className="text-lg font-semibold mt-1 text-destructive">{verificationStats.data.failed}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">No Checksum</div>
                  <div className="text-lg font-semibold mt-1 text-muted-foreground">{verificationStats.data.noChecksum}</div>
                </div>
              </div>
            ) : null}
            {verifyAllBackups.isSuccess && (
              <div className="mt-3 text-sm text-success">
                Batch verification complete: {verifyAllBackups.data.stats.success} passed, {verifyAllBackups.data.stats.failed} failed
              </div>
            )}
            {verifyAllBackups.isError && (
              <div className="mt-3 text-sm text-destructive">{verifyAllBackups.error.message}</div>
            )}
          </div>
        </div>

        {/* Schedule Management Card */}
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Backup Schedules</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure automated backup schedules with retention policies
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingSchedule(null)
                setScheduleForm({
                  name: '',
                  type: 'DATABASE',
                  cronExpression: '0 2 * * *',
                  enabled: true,
                  retentionDays: 30,
                  keepDaily: 7,
                  keepWeekly: 4,
                  keepMonthly: 3,
                })
                setShowScheduleForm(!showScheduleForm)
              }}
            >
              {showScheduleForm ? 'Cancel' : 'New Schedule'}
            </Button>
          </div>
          <div className="p-4">
            {/* Schedule Form */}
            {showScheduleForm && (
              <div className="mb-4 p-4 border border-border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium mb-3">
                  {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1">Name</label>
                    <input
                      type="text"
                      value={scheduleForm.name}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, name: e.target.value })}
                      placeholder="Daily Database Backup"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Type</label>
                    <select
                      value={scheduleForm.type}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, type: e.target.value as 'DATABASE' | 'SOURCE' })}
                      disabled={!!editingSchedule}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    >
                      <option value="DATABASE">Database</option>
                      <option value="SOURCE">Source Code</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Cron Expression</label>
                    <input
                      type="text"
                      value={scheduleForm.cronExpression}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, cronExpression: e.target.value })}
                      placeholder="0 2 * * *"
                      className="w-full px-3 py-2 text-sm font-mono border border-border rounded-lg bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">e.g., "0 2 * * *" = daily at 02:00</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Enabled</label>
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={scheduleForm.enabled}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, enabled: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span className="text-sm">Active</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-2">Retention Policy</label>
                    <div className="grid grid-cols-4 gap-3">
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Max Days</label>
                        <input
                          type="number"
                          value={scheduleForm.retentionDays}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, retentionDays: parseInt(e.target.value) || 30 })}
                          className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Keep Daily</label>
                        <input
                          type="number"
                          value={scheduleForm.keepDaily}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, keepDaily: parseInt(e.target.value) || 7 })}
                          className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Keep Weekly</label>
                        <input
                          type="number"
                          value={scheduleForm.keepWeekly}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, keepWeekly: parseInt(e.target.value) || 4 })}
                          className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-muted-foreground mb-1">Keep Monthly</label>
                        <input
                          type="number"
                          value={scheduleForm.keepMonthly}
                          onChange={(e) => setScheduleForm({ ...scheduleForm, keepMonthly: parseInt(e.target.value) || 3 })}
                          className="w-full px-2 py-1 text-sm border border-border rounded bg-background"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    onClick={handleScheduleSubmit}
                    disabled={createSchedule.isPending || updateSchedule.isPending || !scheduleForm.name}
                  >
                    {createSchedule.isPending || updateSchedule.isPending ? (
                      <>
                        <Spinner className="h-4 w-4 mr-2" />
                        Saving...
                      </>
                    ) : editingSchedule ? 'Update Schedule' : 'Create Schedule'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowScheduleForm(false)}>
                    Cancel
                  </Button>
                </div>
                {(createSchedule.isError || updateSchedule.isError) && (
                  <p className="text-sm text-destructive mt-2">
                    {createSchedule.error?.message || updateSchedule.error?.message}
                  </p>
                )}
              </div>
            )}

            {/* Schedule List */}
            {scheduleList.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Spinner />
                Loading schedules...
              </div>
            ) : scheduleList.data && scheduleList.data.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Name</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                      <th className="text-left px-3 py-2 font-medium">Schedule</th>
                      <th className="text-left px-3 py-2 font-medium">Next Run</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-right px-3 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {scheduleList.data.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium">{schedule.name}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${schedule.type === 'DATABASE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                            {schedule.type}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs">{schedule.cronExpression}</td>
                        <td className="px-3 py-2">
                          {schedule.nextRunAt ? formatDate(new Date(schedule.nextRunAt)) : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`flex items-center gap-1.5 ${schedule.enabled ? 'text-success' : 'text-muted-foreground'}`}>
                            <span className={`w-2 h-2 rounded-full ${schedule.enabled ? 'bg-success' : 'bg-muted'}`} />
                            {schedule.enabled ? 'Active' : 'Paused'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => runScheduleNow.mutate({ id: schedule.id })}
                              disabled={runScheduleNow.isPending}
                            >
                              {runScheduleNow.isPending && runScheduleNow.variables?.id === schedule.id ? (
                                <Spinner className="h-3 w-3" />
                              ) : 'Run'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleEditSchedule(schedule)}>
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSchedule.mutate({ id: schedule.id })}
                              disabled={deleteSchedule.isPending}
                              className="text-destructive hover:text-destructive/80"
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No schedules configured yet. Create one to automate your backups.</p>
            )}
          </div>
        </div>

        {/* Manual Backups Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Database Backup */}
          <div className="bg-card rounded-card border border-border">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Database Backup</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a PostgreSQL dump manually
              </p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => createBackup.mutate()}
                  disabled={createBackup.isPending}
                >
                  {createBackup.isPending ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Backup'
                  )}
                </Button>

                {createBackup.isSuccess && (
                  <span className="text-sm text-success">
                    {lastDbBackup?.fileName}
                  </span>
                )}

                {createBackup.isError && (
                  <span className="text-sm text-destructive">
                    {createBackup.error.message}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Source Code Backup */}
          <div className="bg-card rounded-card border border-border">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">Source Code Backup</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create a full source archive manually
              </p>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => createSourceBackup.mutate()}
                  disabled={createSourceBackup.isPending}
                  variant="outline"
                >
                  {createSourceBackup.isPending ? (
                    <>
                      <Spinner className="h-4 w-4 mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Backup'
                  )}
                </Button>

                {createSourceBackup.isSuccess && (
                  <span className="text-sm text-success">
                    {lastSourceBackup?.fileName}
                  </span>
                )}

                {createSourceBackup.isError && (
                  <span className="text-sm text-destructive">
                    {createSourceBackup.error.message}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Execution History Card */}
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Execution History</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Recent backup executions and their status
            </p>
          </div>
          <div className="p-4">
            {executionHistory.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Spinner />
                Loading history...
              </div>
            ) : executionHistory.data && executionHistory.data.length > 0 ? (
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Started</th>
                      <th className="text-left px-3 py-2 font-medium">Type</th>
                      <th className="text-left px-3 py-2 font-medium">Trigger</th>
                      <th className="text-left px-3 py-2 font-medium">Status</th>
                      <th className="text-left px-3 py-2 font-medium">Duration</th>
                      <th className="text-left px-3 py-2 font-medium">File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {executionHistory.data.map((exec) => (
                      <tr key={exec.id} className="hover:bg-muted/30">
                        <td className="px-3 py-2">{formatDate(new Date(exec.startedAt))}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs ${exec.type === 'DATABASE' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'}`}>
                            {exec.type}
                          </span>
                        </td>
                        <td className="px-3 py-2">{getTriggerLabel(exec.trigger)}</td>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(exec.status)}`} />
                            {exec.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">{formatDuration(exec.durationMs)}</td>
                        <td className="px-3 py-2 font-mono text-xs truncate max-w-[200px]" title={exec.filename || exec.errorMessage || undefined}>
                          {exec.filename || exec.errorMessage || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No execution history yet.</p>
            )}
          </div>
        </div>

        {/* Notification Settings Card */}
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Notification Settings</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure in-app and webhook notifications for backup events
            </p>
          </div>
          <div className="p-4">
            {notificationConfig.isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Spinner />
                Loading settings...
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationConfig.data?.notifyOnSuccess ?? false}
                      onChange={(e) => updateNotifications.mutate({ notifyOnSuccess: e.target.checked })}
                      disabled={updateNotifications.isPending}
                      className="rounded border-border"
                    />
                    <span className="text-sm">Notify on success</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={notificationConfig.data?.notifyOnFailure ?? true}
                      onChange={(e) => updateNotifications.mutate({ notifyOnFailure: e.target.checked })}
                      disabled={updateNotifications.isPending}
                      className="rounded border-border"
                    />
                    <span className="text-sm">Notify on failure</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Webhook URL (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={notificationConfig.data?.webhookUrl || ''}
                      onChange={(e) => updateNotifications.mutate({ webhookUrl: e.target.value || null })}
                      placeholder="https://example.com/webhook"
                      className="flex-1 px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    />
                    <Button
                      variant="outline"
                      onClick={() => testWebhook.mutate()}
                      disabled={testWebhook.isPending || !notificationConfig.data?.webhookUrl}
                    >
                      {testWebhook.isPending ? <Spinner className="h-4 w-4" /> : 'Test'}
                    </Button>
                  </div>
                  {testWebhook.isSuccess && (
                    <p className={`text-xs mt-1 ${testWebhook.data.success ? 'text-success' : 'text-destructive'}`}>
                      {testWebhook.data.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Webhook Secret (optional)</label>
                  <input
                    type="password"
                    value={notificationConfig.data?.webhookSecret || ''}
                    onChange={(e) => updateNotifications.mutate({ webhookSecret: e.target.value || null })}
                    placeholder="Used for HMAC-SHA256 signature"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Webhooks include X-Kanbu-Signature header with signed payload
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Database Restore Card */}
        <div className="bg-card rounded-card border border-border border-warning/50">
          <div className="px-4 py-3 border-b border-border bg-warning/5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <svg className="w-4 h-4 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Database Restore
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Restore database from a previous backup - use with caution
            </p>
          </div>
          <div className="p-4">
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 mb-4">
              <p className="text-sm text-warning-foreground">
                <strong>Warning:</strong> Restoring a database backup will replace ALL current data.
                A pre-restore backup will be created automatically.
              </p>
            </div>

            {restoreConfirm && restoreStep !== 'select' && (
              <div className="mb-4 p-4 border border-border rounded-lg bg-muted/30">
                <h4 className="text-sm font-medium mb-2">
                  {restoreStep === 'confirm' ? 'Confirm Restore' : 'Final Warning'}
                </h4>
                <p className="text-sm text-muted-foreground mb-3">
                  {restoreStep === 'confirm' ? (
                    <>You are about to restore from <code className="bg-muted px-1 rounded">{restoreConfirm}</code>.</>
                  ) : (
                    <span className="text-destructive font-medium">
                      This action cannot be undone. All current data will be replaced.
                    </span>
                  )}
                </p>

                {validateRestore.data && (
                  <div className="text-sm space-y-1 mb-3">
                    <p>File size: {formatFileSize(validateRestore.data.fileSize)}</p>
                    {validateRestore.data.warnings.length > 0 && (
                      <p className="text-warning">Warnings: {validateRestore.data.warnings.join(', ')}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant={restoreStep === 'warning' ? 'destructive' : 'default'}
                    onClick={handleRestoreConfirm}
                    disabled={restoreDatabase.isPending}
                  >
                    {restoreDatabase.isPending ? (
                      <>
                        <Spinner className="h-4 w-4 mr-2" />
                        Restoring...
                      </>
                    ) : restoreStep === 'warning' ? 'Yes, Restore Now' : 'Continue'}
                  </Button>
                  <Button variant="ghost" onClick={() => { setRestoreConfirm(null); setRestoreStep('select'); }}>
                    Cancel
                  </Button>
                </div>

                {restoreDatabase.isError && (
                  <p className="text-sm text-destructive mt-2">{restoreDatabase.error.message}</p>
                )}
                {restoreDatabase.isSuccess && (
                  <p className="text-sm text-success mt-2">Database restored successfully!</p>
                )}
              </div>
            )}

            {restoreStep === 'select' && (
              <>
                {restorableBackups.isLoading ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Spinner />
                    Loading backups...
                  </div>
                ) : restorableBackups.data && restorableBackups.data.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Filename</th>
                          <th className="text-left px-3 py-2 font-medium">Size</th>
                          <th className="text-left px-3 py-2 font-medium">Created</th>
                          <th className="text-right px-3 py-2 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {restorableBackups.data.slice(0, 10).map((backup) => (
                          <tr key={backup.filename} className="hover:bg-muted/30">
                            <td className="px-3 py-2 font-mono text-xs">{backup.filename}</td>
                            <td className="px-3 py-2">{formatFileSize(backup.size)}</td>
                            <td className="px-3 py-2">{formatDate(new Date(backup.createdAt))}</td>
                            <td className="px-3 py-2 text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreClick(backup.filename)}
                                className="text-warning hover:text-warning"
                              >
                                Restore
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No database backups available for restore.</p>
                )}
              </>
            )}
          </div>
        </div>

        {/* Backup Files List */}
        <div className="bg-card rounded-card border border-border">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">All Backup Files</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Browse and manage all stored backup files
            </p>
          </div>
          <div className="p-4 space-y-4">
            {/* Database Backups */}
            {backupList.data?.database && backupList.data.database.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Database Backups ({backupList.data.database.length})
                </h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Filename</th>
                        <th className="text-left px-3 py-2 font-medium">Size</th>
                        <th className="text-left px-3 py-2 font-medium">Created</th>
                        <th className="text-left px-3 py-2 font-medium">Encrypted</th>
                        <th className="text-right px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {backupList.data.database.slice(0, 10).map((backup) => (
                        <tr key={backup.filename} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{backup.filename}</td>
                          <td className="px-3 py-2">{formatFileSize(backup.size)}</td>
                          <td className="px-3 py-2">{formatDate(new Date(backup.createdAt))}</td>
                          <td className="px-3 py-2">
                            {backup.isEncrypted ? (
                              <span className="flex items-center gap-1 text-success">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Yes
                              </span>
                            ) : (
                              <span className="text-muted-foreground">No</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => verifyBackup.mutate({ filename: backup.filename })}
                                disabled={verifyBackup.isPending}
                                title="Verify backup integrity"
                              >
                                {verifyBackup.isPending && verifyBackup.variables?.filename === backup.filename ? (
                                  <Spinner className="h-4 w-4" />
                                ) : 'Verify'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(backup.filename)}
                                disabled={downloadBackup.isPending}
                              >
                                {downloadBackup.isPending && downloadBackup.variables?.filename === backup.filename ? (
                                  <Spinner className="h-4 w-4" />
                                ) : 'Download'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(backup.filename)}
                                disabled={deleteBackup.isPending}
                                className={deleteConfirm === backup.filename ? 'text-destructive hover:text-destructive/80' : ''}
                              >
                                {deleteConfirm === backup.filename ? 'Confirm?' : 'Delete'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Source Backups */}
            {backupList.data?.source && backupList.data.source.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  Source Code Backups ({backupList.data.source.length})
                </h4>
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left px-3 py-2 font-medium">Filename</th>
                        <th className="text-left px-3 py-2 font-medium">Size</th>
                        <th className="text-left px-3 py-2 font-medium">Created</th>
                        <th className="text-left px-3 py-2 font-medium">Encrypted</th>
                        <th className="text-right px-3 py-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {backupList.data.source.slice(0, 10).map((backup) => (
                        <tr key={backup.filename} className="hover:bg-muted/30">
                          <td className="px-3 py-2 font-mono text-xs">{backup.filename}</td>
                          <td className="px-3 py-2">{formatFileSize(backup.size)}</td>
                          <td className="px-3 py-2">{formatDate(new Date(backup.createdAt))}</td>
                          <td className="px-3 py-2">
                            {backup.isEncrypted ? (
                              <span className="inline-flex items-center gap-1 text-xs text-success">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                                Yes
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">No</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDownload(backup.filename)}
                                disabled={downloadBackup.isPending}
                              >
                                {downloadBackup.isPending && downloadBackup.variables?.filename === backup.filename ? (
                                  <Spinner className="h-4 w-4" />
                                ) : 'Download'}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(backup.filename)}
                                disabled={deleteBackup.isPending}
                                className={deleteConfirm === backup.filename ? 'text-destructive hover:text-destructive/80' : ''}
                              >
                                {deleteConfirm === backup.filename ? 'Confirm?' : 'Delete'}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {(!backupList.data?.database?.length && !backupList.data?.source?.length) && (
              <p className="text-sm text-muted-foreground">No backup files found.</p>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-info/10 rounded-lg border border-info/30 p-4">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-info flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-foreground">
              <p className="font-medium">Backup Information</p>
              <p className="mt-1 text-muted-foreground">
                Backups are stored at <code className="bg-info/20 text-info px-1 rounded">{backupStatus.data?.storagePath || 'loading...'}</code>.
                Scheduled backups run according to their cron expressions in the configured timezone.
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
