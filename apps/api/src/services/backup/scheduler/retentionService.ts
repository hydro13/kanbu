/**
 * Backup Retention Service
 *
 * Manages automatic cleanup of old backups based on retention policies.
 * Supports daily, weekly, and monthly retention buckets.
 */

import { type BackupSchedule, BackupType } from '@prisma/client'
import { backupService } from '../backupService'
import type { BackupFile } from '../storage'

export interface RetentionPolicy {
  retentionDays: number
  keepDaily: number
  keepWeekly: number
  keepMonthly: number
}

export interface RetentionResult {
  kept: string[]
  deleted: string[]
  errors: string[]
}

interface CategorizedBackups {
  daily: BackupFile[]
  weekly: BackupFile[]
  monthly: BackupFile[]
  tooOld: BackupFile[]
}

/**
 * Parse date from backup filename
 *
 * Expected formats:
 * - kanbu_backup_2026-01-18T10-30-00.sql
 * - kanbu_source_2026-01-18T10-30-00.tar.gz
 */
function parseDateFromFilename(filename: string): Date | null {
  // Match pattern like 2026-01-18T10-30-00
  const match = filename.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)
  if (!match || !match[1]) return null

  try {
    // Convert from 2026-01-18T10-30-00 to 2026-01-18T10:30:00
    const isoString = match[1].replace(/-(\d{2})-(\d{2})$/, ':$1:$2')
    return new Date(isoString)
  } catch {
    return null
  }
}

/**
 * Get the week number of a date
 */
function getWeekNumber(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1)
  const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
  return Math.ceil((days + startOfYear.getDay() + 1) / 7)
}

export class RetentionService {
  /**
   * Apply retention policy to backups for a schedule
   */
  async applyRetention(schedule: BackupSchedule): Promise<RetentionResult> {
    const policy: RetentionPolicy = {
      retentionDays: schedule.retentionDays,
      keepDaily: schedule.keepDaily,
      keepWeekly: schedule.keepWeekly,
      keepMonthly: schedule.keepMonthly,
    }

    const type = schedule.type === BackupType.DATABASE ? 'database' : 'source'
    return this.applyRetentionForType(type, policy)
  }

  /**
   * Apply retention policy for a specific backup type
   */
  async applyRetentionForType(
    type: 'database' | 'source',
    policy: RetentionPolicy
  ): Promise<RetentionResult> {
    const result: RetentionResult = {
      kept: [],
      deleted: [],
      errors: [],
    }

    try {
      // Get all backups
      const backups = await backupService.listBackups()
      const files = type === 'database' ? backups.database : backups.source

      if (files.length === 0) {
        return result
      }

      // Sort by date (newest first)
      const sortedFiles = [...files].sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      )

      // Categorize backups
      const categorized = this.categorizeBackups(sortedFiles, policy)

      // Select backups to keep
      const toKeep = this.selectBackupsToKeep(categorized, policy)
      const toKeepSet = new Set(toKeep.map(f => f.filename))

      // Determine what to delete
      for (const file of sortedFiles) {
        if (toKeepSet.has(file.filename)) {
          result.kept.push(file.filename)
        } else {
          // Delete the backup
          try {
            await backupService.deleteBackup(file.filename)
            result.deleted.push(file.filename)
            console.log(`[Retention] Deleted: ${file.filename}`)
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            result.errors.push(`Failed to delete ${file.filename}: ${errorMsg}`)
            console.error(`[Retention] Failed to delete ${file.filename}:`, error)
          }
        }
      }

      console.log(`[Retention] ${type}: kept ${result.kept.length}, deleted ${result.deleted.length}`)
      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      result.errors.push(`Retention policy failed: ${errorMsg}`)
      return result
    }
  }

  /**
   * Categorize backups into retention buckets
   */
  private categorizeBackups(
    files: BackupFile[],
    policy: RetentionPolicy
  ): CategorizedBackups {
    const now = new Date()
    const cutoffDate = new Date(now.getTime() - policy.retentionDays * 24 * 60 * 60 * 1000)

    const result: CategorizedBackups = {
      daily: [],
      weekly: [],
      monthly: [],
      tooOld: [],
    }

    // Track which weeks/months we've seen
    const seenWeeks = new Set<string>()
    const seenMonths = new Set<string>()

    for (const file of files) {
      const fileDate = parseDateFromFilename(file.filename) || file.createdAt

      // Check if too old
      if (fileDate < cutoffDate) {
        result.tooOld.push(file)
        continue
      }

      // Check for monthly (first backup of each month)
      const monthKey = `${fileDate.getFullYear()}-${fileDate.getMonth()}`
      if (!seenMonths.has(monthKey)) {
        result.monthly.push(file)
        seenMonths.add(monthKey)
        continue
      }

      // Check for weekly (first backup of each week)
      const weekKey = `${fileDate.getFullYear()}-W${getWeekNumber(fileDate)}`
      if (!seenWeeks.has(weekKey)) {
        result.weekly.push(file)
        seenWeeks.add(weekKey)
        continue
      }

      // Otherwise it's a daily backup
      result.daily.push(file)
    }

    return result
  }

  /**
   * Select which backups to keep based on policy
   */
  private selectBackupsToKeep(
    categorized: CategorizedBackups,
    policy: RetentionPolicy
  ): BackupFile[] {
    const kept: BackupFile[] = []

    // Keep the most recent daily backups
    kept.push(...categorized.daily.slice(0, policy.keepDaily))

    // Keep the most recent weekly backups
    kept.push(...categorized.weekly.slice(0, policy.keepWeekly))

    // Keep the most recent monthly backups
    kept.push(...categorized.monthly.slice(0, policy.keepMonthly))

    // Always keep at least one backup (the most recent)
    if (kept.length === 0) {
      const allBackups = [
        ...categorized.daily,
        ...categorized.weekly,
        ...categorized.monthly,
        ...categorized.tooOld,
      ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

      const mostRecent = allBackups[0]
      if (mostRecent) {
        kept.push(mostRecent)
      }
    }

    return kept
  }

  /**
   * Preview what would be deleted without actually deleting
   * Can be called with either a schedule or type+policy
   */
  async previewRetention(
    scheduleOrType: BackupSchedule | 'database' | 'source',
    policyArg?: RetentionPolicy
  ): Promise<{ toKeep: string[]; toDelete: string[] }> {
    let type: 'database' | 'source'
    let policy: RetentionPolicy

    if (typeof scheduleOrType === 'object') {
      type = scheduleOrType.type === BackupType.DATABASE ? 'database' : 'source'
      policy = {
        retentionDays: scheduleOrType.retentionDays,
        keepDaily: scheduleOrType.keepDaily,
        keepWeekly: scheduleOrType.keepWeekly,
        keepMonthly: scheduleOrType.keepMonthly,
      }
    } else {
      type = scheduleOrType
      policy = policyArg!
    }

    const backups = await backupService.listBackups()
    const files = type === 'database' ? backups.database : backups.source

    if (files.length === 0) {
      return { toKeep: [], toDelete: [] }
    }

    const sortedFiles = [...files].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )

    const categorized = this.categorizeBackups(sortedFiles, policy)
    const toKeep = this.selectBackupsToKeep(categorized, policy)
    const toKeepSet = new Set(toKeep.map(f => f.filename))

    return {
      toKeep: toKeep.map(f => f.filename),
      toDelete: sortedFiles
        .filter(f => !toKeepSet.has(f.filename))
        .map(f => f.filename),
    }
  }
}

// Singleton export
export const retentionService = new RetentionService()
