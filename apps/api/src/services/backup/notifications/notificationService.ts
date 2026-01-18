/**
 * Backup Notification Service
 *
 * Handles notifications for backup events:
 * - In-app notifications for admins
 * - Webhook notifications for external integrations
 */

import { createHmac } from 'crypto'
import { prisma } from '../../../lib/prisma'
import type { BackupNotificationConfig } from '@prisma/client'
import {
  createNotification,
  type NotificationData,
} from '../../../lib/notificationService'

export interface WebhookPayload {
  event: 'backup.completed' | 'backup.failed' | 'restore.completed' | 'restore.failed'
  timestamp: string
  execution: {
    id: number
    type: string
    trigger: string
    status: string
    filename: string | null
    fileSize: number | null
    durationMs: number | null
    errorMessage: string | null
    // Phase 4.1 + 4.4: Encryption and verification
    isEncrypted?: boolean
    checksum?: string | null
  }
  schedule?: {
    id: number
    name: string
  } | null
}

/** Input for notifyBackupResult - simplified interface */
export interface BackupResultNotification {
  success: boolean
  type: 'database' | 'source'
  filename?: string
  fileSize?: number
  durationMs?: number
  error?: string
  trigger?: 'scheduled' | 'manual' | 'external'
  scheduleName?: string
  // Phase 4.1 + 4.4: Encryption and verification
  isEncrypted?: boolean
  checksum?: string
}

/** Input for notifyRestoreResult */
export interface RestoreResultNotification {
  success: boolean
  filename: string
  message: string
  durationMs: number
  preRestoreBackup?: string
  error?: string
}

export class BackupNotificationService {
  /**
   * Get notification config (singleton)
   */
  async getConfig(): Promise<BackupNotificationConfig | null> {
    return prisma.backupNotificationConfig.findFirst()
  }

  /**
   * Update or create notification config
   */
  async updateConfig(data: {
    notifyOnSuccess?: boolean
    notifyOnFailure?: boolean
    webhookUrl?: string | null
    webhookSecret?: string | null
  }): Promise<BackupNotificationConfig> {
    const existing = await this.getConfig()

    if (existing) {
      return prisma.backupNotificationConfig.update({
        where: { id: existing.id },
        data,
      })
    }

    return prisma.backupNotificationConfig.create({
      data: {
        notifyOnSuccess: data.notifyOnSuccess ?? false,
        notifyOnFailure: data.notifyOnFailure ?? true,
        webhookUrl: data.webhookUrl ?? null,
        webhookSecret: data.webhookSecret ?? null,
      },
    })
  }

  /**
   * Notify about backup result (simplified interface)
   */
  async notifyBackupResult(data: BackupResultNotification): Promise<void> {
    const config = await this.getConfig()
    if (!config) return

    const shouldNotify = data.success ? config.notifyOnSuccess : config.notifyOnFailure
    if (!shouldNotify) return

    // Send in-app notifications to admins
    await this.sendBackupInAppNotification(data)

    // Send webhook if configured
    if (config.webhookUrl) {
      await this.sendBackupWebhook(config, data)
    }
  }

  /**
   * Notify about restore result (simplified interface)
   */
  async notifyRestoreResult(data: RestoreResultNotification): Promise<void> {
    const config = await this.getConfig()
    if (!config) return

    const shouldNotify = data.success ? config.notifyOnSuccess : config.notifyOnFailure
    if (!shouldNotify) return

    // Send in-app notifications to admins
    await this.sendRestoreInAppNotification(data)

    // Send webhook if configured
    if (config.webhookUrl) {
      await this.sendRestoreWebhookSimple(config, data)
    }
  }

  /**
   * Send in-app notification to all admins (simplified)
   */
  private async sendBackupInAppNotification(data: BackupResultNotification): Promise<void> {
    try {
      // Get all admin users
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: { id: true },
      })

      if (admins.length === 0) return

      const notificationType = data.success ? 'backup_completed' : 'backup_failed'
      const notificationData: NotificationData = {
        backupType: data.type,
        backupFilename: data.filename,
        backupSize: data.fileSize,
        backupDuration: data.durationMs,
        backupError: data.error,
        link: '/admin/backup',
      }

      const typeLabel = data.type === 'database' ? 'Database' : 'Source'

      // Create notification for each admin
      for (const admin of admins) {
        await createNotification(prisma, {
          userId: admin.id,
          type: notificationType,
          title: data.success
            ? `${typeLabel} backup completed`
            : `${typeLabel} backup failed`,
          content: data.success
            ? `${data.filename ?? 'Backup'} created successfully`
            : data.error ?? 'An error occurred',
          data: notificationData,
        })
      }

      console.log(`[BackupNotification] Sent in-app notifications to ${admins.length} admin(s)`)
    } catch (error) {
      console.error('[BackupNotification] Failed to send in-app notification:', error)
    }
  }

  /**
   * Send restore notification to admins (simplified)
   */
  private async sendRestoreInAppNotification(data: RestoreResultNotification): Promise<void> {
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isActive: true,
        },
        select: { id: true },
      })

      if (admins.length === 0) return

      const notificationType = data.success ? 'restore_completed' : 'restore_failed'
      const notificationData: NotificationData = {
        backupType: 'database',
        backupFilename: data.filename,
        backupDuration: data.durationMs,
        backupError: data.error,
        link: '/admin/backup',
      }

      for (const admin of admins) {
        await createNotification(prisma, {
          userId: admin.id,
          type: notificationType,
          title: data.success ? 'Database restore completed' : 'Database restore failed',
          content: data.success
            ? `Restored from ${data.filename}`
            : data.error ?? 'An error occurred',
          data: notificationData,
        })
      }

      console.log(`[BackupNotification] Sent restore notifications to ${admins.length} admin(s)`)
    } catch (error) {
      console.error('[BackupNotification] Failed to send restore notification:', error)
    }
  }

  /**
   * Send backup webhook notification (simplified)
   */
  private async sendBackupWebhook(
    config: BackupNotificationConfig,
    data: BackupResultNotification
  ): Promise<void> {
    if (!config.webhookUrl) return

    const payload: WebhookPayload = {
      event: data.success ? 'backup.completed' : 'backup.failed',
      timestamp: new Date().toISOString(),
      execution: {
        id: 0, // Not stored in execution table for simple notifications
        type: data.type.toUpperCase(),
        trigger: (data.trigger ?? 'manual').toUpperCase(),
        status: data.success ? 'COMPLETED' : 'FAILED',
        filename: data.filename ?? null,
        fileSize: data.fileSize ?? null,
        durationMs: data.durationMs ?? null,
        errorMessage: data.error ?? null,
        isEncrypted: data.isEncrypted,
        checksum: data.checksum ?? null,
      },
      schedule: data.scheduleName ? { id: 0, name: data.scheduleName } : null,
    }

    await this.deliverWebhook(config.webhookUrl, payload, config.webhookSecret)
  }

  /**
   * Send restore webhook notification (simplified)
   */
  private async sendRestoreWebhookSimple(
    config: BackupNotificationConfig,
    data: RestoreResultNotification
  ): Promise<void> {
    if (!config.webhookUrl) return

    const payload: WebhookPayload = {
      event: data.success ? 'restore.completed' : 'restore.failed',
      timestamp: new Date().toISOString(),
      execution: {
        id: 0,
        type: 'DATABASE',
        trigger: 'MANUAL',
        status: data.success ? 'COMPLETED' : 'FAILED',
        filename: data.filename,
        fileSize: null,
        durationMs: data.durationMs,
        errorMessage: data.error ?? null,
      },
    }

    await this.deliverWebhook(config.webhookUrl, payload, config.webhookSecret)
  }

  /**
   * Deliver webhook with optional signature
   */
  private async deliverWebhook(
    url: string,
    payload: WebhookPayload,
    secret: string | null
  ): Promise<void> {
    try {
      const body = JSON.stringify(payload)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Kanbu-Backup/1.0',
      }

      // Add signature if secret is configured
      if (secret) {
        const signature = this.signPayload(body, secret)
        headers['X-Kanbu-Signature'] = signature
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
      })

      if (!response.ok) {
        console.error(
          `[BackupNotification] Webhook failed: ${response.status} ${response.statusText}`
        )
      } else {
        console.log(`[BackupNotification] Webhook delivered to ${url}`)
      }
    } catch (error) {
      console.error('[BackupNotification] Webhook delivery failed:', error)
    }
  }

  /**
   * Sign payload with HMAC-SHA256
   */
  private signPayload(payload: string, secret: string): string {
    const hmac = createHmac('sha256', secret)
    hmac.update(payload)
    return `sha256=${hmac.digest('hex')}`
  }

  /**
   * Test webhook delivery
   */
  async testWebhook(): Promise<{ success: boolean; message: string }> {
    const config = await this.getConfig()

    if (!config?.webhookUrl) {
      return { success: false, message: 'No webhook URL configured' }
    }

    const testPayload: WebhookPayload = {
      event: 'backup.completed',
      timestamp: new Date().toISOString(),
      execution: {
        id: 0,
        type: 'DATABASE',
        trigger: 'MANUAL',
        status: 'COMPLETED',
        filename: 'test_backup.sql',
        fileSize: 1024,
        durationMs: 1000,
        errorMessage: null,
      },
    }

    try {
      const body = JSON.stringify(testPayload)
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Kanbu-Backup/1.0',
        'X-Kanbu-Test': 'true',
      }

      if (config.webhookSecret) {
        headers['X-Kanbu-Signature'] = this.signPayload(body, config.webhookSecret)
      }

      const response = await fetch(config.webhookUrl, {
        method: 'POST',
        headers,
        body,
      })

      if (response.ok) {
        return { success: true, message: `Webhook delivered successfully (${response.status})` }
      } else {
        return {
          success: false,
          message: `Webhook failed: ${response.status} ${response.statusText}`,
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { success: false, message: `Webhook delivery failed: ${message}` }
    }
  }
}

// Singleton export
export const backupNotificationService = new BackupNotificationService()
