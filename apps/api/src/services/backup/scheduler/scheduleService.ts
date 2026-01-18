/**
 * Backup Schedule Service
 *
 * CRUD operations for backup schedules and execution logic.
 * Supports both internal (node-cron) and external (HTTP trigger) scheduling.
 */

import { prisma } from '../../../lib/prisma'
import {
  type BackupSchedule,
  type BackupExecution,
  BackupType,
  BackupTrigger,
  BackupStatus,
} from '@prisma/client'
import { CronExpressionParser } from 'cron-parser'
import { backupService } from '../backupService'
import { backupNotificationService } from '../notifications'

export interface CreateScheduleInput {
  name: string
  type: 'DATABASE' | 'SOURCE'
  cronExpression: string
  enabled?: boolean
  retentionDays?: number
  keepDaily?: number
  keepWeekly?: number
  keepMonthly?: number
  createdById: number
}

export interface UpdateScheduleInput {
  name?: string
  cronExpression?: string
  enabled?: boolean
  retentionDays?: number
  keepDaily?: number
  keepWeekly?: number
  keepMonthly?: number
}

export interface ExecutionResult {
  execution: BackupExecution
  success: boolean
  message: string
}

/**
 * Validate cron expression
 */
export function isValidCronExpression(expression: string): boolean {
  try {
    CronExpressionParser.parse(expression)
    return true
  } catch {
    return false
  }
}

/**
 * Calculate next run time from cron expression
 */
export function calculateNextRun(cronExpression: string): Date | null {
  try {
    const interval = CronExpressionParser.parse(cronExpression, {
      tz: process.env.BACKUP_CRON_TIMEZONE || 'Europe/Amsterdam',
    })
    return interval.next().toDate()
  } catch {
    return null
  }
}

/**
 * Format cron expression to human-readable string
 */
export function describeCronExpression(cronExpression: string): string {
  try {
    const parts = cronExpression.split(' ')
    if (parts.length !== 5) return cronExpression

    const minute = parts[0] ?? ''
    const hour = parts[1] ?? ''
    const dayOfMonth = parts[2] ?? ''
    const month = parts[3] ?? ''
    const dayOfWeek = parts[4] ?? ''

    // Simple patterns
    if (minute === '0' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
      return `Daily at ${hour.padStart(2, '0')}:00`
    }
    if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '0') {
      return `Weekly on Sunday at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
    }
    if (minute !== '*' && hour !== '*' && dayOfMonth === '1' && month === '*' && dayOfWeek === '*') {
      return `Monthly on the 1st at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`
    }

    return cronExpression
  } catch {
    return cronExpression
  }
}

export class BackupScheduleService {
  /**
   * Create a new backup schedule
   */
  async createSchedule(data: CreateScheduleInput): Promise<BackupSchedule> {
    // Validate cron expression
    if (!isValidCronExpression(data.cronExpression)) {
      throw new Error(`Invalid cron expression: ${data.cronExpression}`)
    }

    const nextRunAt = data.enabled !== false ? calculateNextRun(data.cronExpression) : null

    return prisma.backupSchedule.create({
      data: {
        name: data.name,
        type: data.type as BackupType,
        cronExpression: data.cronExpression,
        enabled: data.enabled ?? true,
        retentionDays: data.retentionDays ?? 30,
        keepDaily: data.keepDaily ?? 7,
        keepWeekly: data.keepWeekly ?? 4,
        keepMonthly: data.keepMonthly ?? 3,
        nextRunAt,
        createdById: data.createdById,
      },
    })
  }

  /**
   * Update an existing schedule
   */
  async updateSchedule(id: number, data: UpdateScheduleInput): Promise<BackupSchedule> {
    // If cron expression is being updated, validate it
    if (data.cronExpression && !isValidCronExpression(data.cronExpression)) {
      throw new Error(`Invalid cron expression: ${data.cronExpression}`)
    }

    const existing = await prisma.backupSchedule.findUnique({ where: { id } })
    if (!existing) {
      throw new Error(`Schedule not found: ${id}`)
    }

    // Calculate new nextRunAt if cronExpression or enabled status changes
    let nextRunAt = existing.nextRunAt
    const newCron = data.cronExpression ?? existing.cronExpression
    const newEnabled = data.enabled ?? existing.enabled

    if (data.cronExpression !== undefined || data.enabled !== undefined) {
      nextRunAt = newEnabled ? calculateNextRun(newCron) : null
    }

    return prisma.backupSchedule.update({
      where: { id },
      data: {
        ...data,
        type: undefined, // Type cannot be changed
        nextRunAt,
      },
    })
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: number): Promise<void> {
    await prisma.backupSchedule.delete({ where: { id } })
  }

  /**
   * Get a single schedule
   */
  async getSchedule(id: number): Promise<BackupSchedule | null> {
    return prisma.backupSchedule.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  /**
   * List all schedules
   */
  async listSchedules(): Promise<BackupSchedule[]> {
    return prisma.backupSchedule.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  /**
   * Get schedules that are due to run
   */
  async getDueSchedules(): Promise<BackupSchedule[]> {
    const now = new Date()
    return prisma.backupSchedule.findMany({
      where: {
        enabled: true,
        nextRunAt: { lte: now },
      },
    })
  }

  /**
   * Execute a scheduled backup
   */
  async executeSchedule(
    scheduleId: number,
    trigger: 'SCHEDULED' | 'MANUAL' | 'EXTERNAL'
  ): Promise<ExecutionResult> {
    const schedule = await prisma.backupSchedule.findUnique({
      where: { id: scheduleId },
    })

    if (!schedule) {
      throw new Error(`Schedule not found: ${scheduleId}`)
    }

    return this.executeBackup(schedule.type, trigger as BackupTrigger, scheduleId)
  }

  /**
   * Execute a backup by type (for external triggers without schedule)
   */
  async executeByType(
    type: 'DATABASE' | 'SOURCE',
    trigger: 'EXTERNAL'
  ): Promise<ExecutionResult> {
    return this.executeBackup(type as BackupType, trigger as BackupTrigger, null)
  }

  /**
   * Core backup execution logic
   */
  private async executeBackup(
    type: BackupType,
    trigger: BackupTrigger,
    scheduleId: number | null
  ): Promise<ExecutionResult> {
    const startedAt = new Date()

    // Create execution record
    const execution = await prisma.backupExecution.create({
      data: {
        scheduleId,
        type,
        trigger,
        status: BackupStatus.RUNNING,
        startedAt,
      },
    })

    try {
      // Execute the actual backup
      const result = type === BackupType.DATABASE
        ? await backupService.createDatabaseBackup()
        : await backupService.createSourceBackup()

      const completedAt = new Date()
      const durationMs = completedAt.getTime() - startedAt.getTime()

      // Update execution record with success
      const updatedExecution = await prisma.backupExecution.update({
        where: { id: execution.id },
        data: {
          status: BackupStatus.COMPLETED,
          filename: result.fileName,
          fileSize: result.fileSizeKB ? result.fileSizeKB * 1024 : (result.fileSizeMB ? result.fileSizeMB * 1024 * 1024 : null),
          completedAt,
          durationMs,
        },
      })

      // Update schedule's lastRunAt and nextRunAt
      if (scheduleId) {
        const schedule = await prisma.backupSchedule.findUnique({
          where: { id: scheduleId },
        })
        if (schedule) {
          await prisma.backupSchedule.update({
            where: { id: scheduleId },
            data: {
              lastRunAt: completedAt,
              nextRunAt: schedule.enabled ? calculateNextRun(schedule.cronExpression) : null,
            },
          })
        }
      }

      // Send success notification
      try {
        await backupNotificationService.notifyBackupResult({
          success: true,
          type: type === BackupType.DATABASE ? 'database' : 'source',
          filename: result.fileName,
          fileSize: result.fileSizeKB ? result.fileSizeKB * 1024 : (result.fileSizeMB ? result.fileSizeMB * 1024 * 1024 : undefined),
          durationMs,
          trigger: trigger === BackupTrigger.SCHEDULED ? 'scheduled' :
                   trigger === BackupTrigger.MANUAL ? 'manual' : 'external',
          scheduleName: scheduleId ? (await prisma.backupSchedule.findUnique({
            where: { id: scheduleId },
            select: { name: true },
          }))?.name : undefined,
        })
      } catch (notifyError) {
        console.error('[Backup] Failed to send notification:', notifyError)
      }

      return {
        execution: updatedExecution,
        success: true,
        message: result.message ?? 'Backup completed successfully',
      }
    } catch (error) {
      const completedAt = new Date()
      const durationMs = completedAt.getTime() - startedAt.getTime()
      const errorMessage = error instanceof Error ? error.message : String(error)

      // Update execution record with failure
      const updatedExecution = await prisma.backupExecution.update({
        where: { id: execution.id },
        data: {
          status: BackupStatus.FAILED,
          errorMessage,
          completedAt,
          durationMs,
        },
      })

      // Still update schedule's lastRunAt (but calculate next run)
      let scheduleName: string | undefined
      if (scheduleId) {
        const schedule = await prisma.backupSchedule.findUnique({
          where: { id: scheduleId },
        })
        if (schedule) {
          scheduleName = schedule.name
          await prisma.backupSchedule.update({
            where: { id: scheduleId },
            data: {
              lastRunAt: completedAt,
              nextRunAt: schedule.enabled ? calculateNextRun(schedule.cronExpression) : null,
            },
          })
        }
      }

      // Send failure notification
      try {
        await backupNotificationService.notifyBackupResult({
          success: false,
          type: type === BackupType.DATABASE ? 'database' : 'source',
          error: errorMessage,
          durationMs,
          trigger: trigger === BackupTrigger.SCHEDULED ? 'scheduled' :
                   trigger === BackupTrigger.MANUAL ? 'manual' : 'external',
          scheduleName,
        })
      } catch (notifyError) {
        console.error('[Backup] Failed to send failure notification:', notifyError)
      }

      return {
        execution: updatedExecution,
        success: false,
        message: errorMessage,
      }
    }
  }

  /**
   * Get execution history
   */
  async getExecutionHistory(options?: {
    scheduleId?: number
    limit?: number
    type?: 'DATABASE' | 'SOURCE'
  }): Promise<BackupExecution[]> {
    return prisma.backupExecution.findMany({
      where: {
        scheduleId: options?.scheduleId,
        type: options?.type as BackupType,
      },
      orderBy: { startedAt: 'desc' },
      take: options?.limit ?? 50,
      include: {
        schedule: {
          select: { id: true, name: true },
        },
      },
    })
  }

  /**
   * Get recent executions for dashboard
   */
  async getRecentExecutions(limit: number = 10): Promise<BackupExecution[]> {
    return prisma.backupExecution.findMany({
      orderBy: { startedAt: 'desc' },
      take: limit,
      include: {
        schedule: {
          select: { id: true, name: true },
        },
      },
    })
  }

  /**
   * Get execution statistics
   */
  async getExecutionStats(): Promise<{
    total: number
    successful: number
    failed: number
    lastSuccess: Date | null
    lastFailure: Date | null
  }> {
    const [total, successful, failed, lastSuccessExec, lastFailureExec] = await Promise.all([
      prisma.backupExecution.count(),
      prisma.backupExecution.count({ where: { status: BackupStatus.COMPLETED } }),
      prisma.backupExecution.count({ where: { status: BackupStatus.FAILED } }),
      prisma.backupExecution.findFirst({
        where: { status: BackupStatus.COMPLETED },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
      prisma.backupExecution.findFirst({
        where: { status: BackupStatus.FAILED },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      }),
    ])

    return {
      total,
      successful,
      failed,
      lastSuccess: lastSuccessExec?.completedAt ?? null,
      lastFailure: lastFailureExec?.completedAt ?? null,
    }
  }
}

// Singleton export
export const scheduleService = new BackupScheduleService()
