/**
 * Database Restore Service
 *
 * Handles safe restoration of database backups with:
 * - Pre-restore backup creation
 * - Validation of backup files
 * - Decryption of encrypted backups (Phase 4.1)
 * - Checksum verification (Phase 4.4)
 * - Restore execution via psql
 * - Post-restore verification
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { backupService } from '../backupService'
import { getBackupStorage } from '../storage'
import { findPostgresContainer } from '../container/dockerDiscovery'
import { backupNotificationService } from '../notifications'
import {
  isEncryptedFile,
  decryptFile,
  isEncryptionEnabled,
} from '../crypto'
import { verifyChecksum } from '../crypto/checksum'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { prisma } from '../../../lib/prisma'

const execAsync = promisify(exec)

export interface RestoreOptions {
  /** Create a backup before restoring (recommended) */
  createPreRestoreBackup?: boolean
  /** Skip verification after restore */
  skipVerification?: boolean
  /** User ID performing the restore (for audit) */
  performedById?: number
}

export interface RestoreResult {
  success: boolean
  message: string
  preRestoreBackup?: string
  restoredFrom: string
  durationMs: number
  tablesRestored?: number
}

export interface RestoreValidation {
  isValid: boolean
  filename: string
  fileSize: number
  backupType: 'database' | 'source'
  isEncrypted: boolean
  hasStoredChecksum: boolean
  errors: string[]
  warnings: string[]
}

export class RestoreService {
  /**
   * Validate a backup file before restore
   *
   * Checks:
   * - Filename format
   * - File exists in storage
   * - File size
   * - Encryption status (and key availability)
   * - Stored checksum availability
   */
  async validateBackup(filename: string): Promise<RestoreValidation> {
    const errors: string[] = []
    const warnings: string[] = []

    // Check filename format - support all variations
    // Database: kanbu_backup_*.sql, kanbu_backup_*.sql.gz, kanbu_backup_*.sql.gz.enc
    // Source: kanbu_source_*.tar.gz, kanbu_source_*.tar.gz.enc
    const databasePattern = /^kanbu_backup_.*\.sql(\.gz)?(\.enc)?$/
    const sourcePattern = /^kanbu_source_.*\.tar\.gz(\.enc)?$/

    const isDatabaseBackup = databasePattern.test(filename)
    const isSourceBackup = sourcePattern.test(filename)

    if (!isDatabaseBackup && !isSourceBackup) {
      errors.push('Invalid backup filename format')
      return {
        isValid: false,
        filename,
        fileSize: 0,
        backupType: 'database',
        isEncrypted: false,
        hasStoredChecksum: false,
        errors,
        warnings,
      }
    }

    const backupType = isDatabaseBackup ? 'database' : 'source'
    const isEncrypted = isEncryptedFile(filename)

    // Only database backups can be restored via this service
    if (isSourceBackup) {
      errors.push('Source backups cannot be restored automatically. Manual extraction required.')
      return {
        isValid: false,
        filename,
        fileSize: 0,
        backupType: 'source',
        isEncrypted,
        hasStoredChecksum: false,
        errors,
        warnings,
      }
    }

    // Check encryption key availability
    if (isEncrypted && !isEncryptionEnabled()) {
      errors.push(
        'Backup is encrypted but BACKUP_ENCRYPTION_KEY is not set. ' +
        'Set the encryption key in environment variables to restore this backup.'
      )
    }

    // Check if file exists in storage
    const storage = getBackupStorage()
    let hasStoredChecksum = false

    try {
      const backups = await storage.list('database')
      const backup = backups.find(b => b.filename === filename)

      if (!backup) {
        errors.push('Backup file not found in storage')
        return {
          isValid: false,
          filename,
          fileSize: 0,
          backupType,
          isEncrypted,
          hasStoredChecksum: false,
          errors,
          warnings,
        }
      }

      // Check file size
      if (backup.size < 100) {
        errors.push('Backup file appears to be empty or corrupted (< 100 bytes)')
      }

      // Check if we have a stored checksum in the database
      try {
        const execution = await prisma.backupExecution.findFirst({
          where: { filename },
          select: { checksum: true },
        })
        hasStoredChecksum = !!execution?.checksum
        if (!hasStoredChecksum) {
          warnings.push('No stored checksum found - integrity verification will be skipped')
        }
      } catch {
        warnings.push('Could not check for stored checksum - verification may be skipped')
      }

      // Check age warning
      const ageInDays = (Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      if (ageInDays > 30) {
        warnings.push(`Backup is ${Math.floor(ageInDays)} days old`)
      }

      return {
        isValid: errors.length === 0,
        filename,
        fileSize: backup.size,
        backupType,
        isEncrypted,
        hasStoredChecksum,
        errors,
        warnings,
      }
    } catch (error) {
      errors.push(`Failed to access storage: ${error instanceof Error ? error.message : String(error)}`)
      return {
        isValid: false,
        filename,
        fileSize: 0,
        backupType,
        isEncrypted,
        hasStoredChecksum: false,
        errors,
        warnings,
      }
    }
  }

  /**
   * Restore a database backup
   *
   * Pipeline:
   * 1. Validate backup
   * 2. Create pre-restore backup (optional)
   * 3. Download backup file
   * 4. Decrypt if encrypted (Phase 4.1)
   * 5. Verify checksum if available (Phase 4.4)
   * 6. Decompress
   * 7. Execute restore via psql
   * 8. Verify database tables
   *
   * WARNING: This will overwrite the current database!
   */
  async restoreDatabase(
    filename: string,
    options: RestoreOptions = {}
  ): Promise<RestoreResult> {
    const startTime = Date.now()
    const { createPreRestoreBackup = true, skipVerification = false } = options
    const tempFiles: string[] = []

    let preRestoreBackupName: string | undefined

    try {
      // Step 1: Validate the backup
      console.log(`[Restore] Validating backup: ${filename}`)
      const validation = await this.validateBackup(filename)

      if (!validation.isValid) {
        throw new Error(`Backup validation failed: ${validation.errors.join(', ')}`)
      }

      // Step 2: Create pre-restore backup if requested
      if (createPreRestoreBackup) {
        console.log('[Restore] Creating pre-restore backup...')
        try {
          const preRestoreResult = await backupService.createDatabaseBackup()
          preRestoreBackupName = preRestoreResult.fileName
          console.log(`[Restore] Pre-restore backup created: ${preRestoreBackupName}`)
        } catch (error) {
          console.error('[Restore] Failed to create pre-restore backup:', error)
          throw new Error(`Failed to create pre-restore backup: ${error instanceof Error ? error.message : String(error)}`)
        }
      }

      // Step 3: Download backup file to temp location
      console.log('[Restore] Downloading backup file...')
      const storage = getBackupStorage()
      const backupData = await storage.download(filename)

      const tempDir = os.tmpdir()
      let currentPath = path.join(tempDir, filename)
      await fs.writeFile(currentPath, backupData)
      tempFiles.push(currentPath)

      // Step 4: Decrypt if encrypted
      if (validation.isEncrypted) {
        console.log('[Restore] Decrypting backup...')
        const decryptedPath = currentPath.replace('.enc', '')
        const decryptResult = await decryptFile(currentPath, decryptedPath)
        currentPath = decryptResult.decryptedPath
        tempFiles.push(currentPath)
      }

      // Step 5: Verify checksum if available
      if (validation.hasStoredChecksum) {
        console.log('[Restore] Verifying checksum...')
        const execution = await prisma.backupExecution.findFirst({
          where: { filename },
          select: { checksum: true },
        })

        if (execution?.checksum) {
          const isValid = await verifyChecksum(currentPath, execution.checksum)
          if (!isValid) {
            throw new Error(
              'Checksum verification failed! The backup file may be corrupted or tampered with. ' +
              'Restore aborted for safety.'
            )
          }
          console.log('[Restore] Checksum verified successfully')
        }
      } else {
        console.log('[Restore] Skipping checksum verification (no stored checksum)')
      }

      // Step 6: Decompress the backup (handle both .sql.gz and legacy .sql)
      let sqlPath: string
      if (currentPath.endsWith('.gz')) {
        console.log('[Restore] Decompressing backup...')
        sqlPath = currentPath.replace('.gz', '')
        await execAsync(`gunzip -c "${currentPath}" > "${sqlPath}"`)
        tempFiles.push(sqlPath)
      } else if (currentPath.endsWith('.sql')) {
        // Legacy uncompressed backup
        sqlPath = currentPath
      } else {
        throw new Error(`Unexpected file format: ${currentPath}`)
      }

      // Step 7: Find postgres container
      const container = await findPostgresContainer()
      if (!container) {
        throw new Error('PostgreSQL container not found')
      }

      // Get database credentials from environment
      const dbName = process.env.POSTGRES_DB || 'kanbu'
      const dbUser = process.env.POSTGRES_USER || 'kanbu'

      // Step 8: Copy SQL file to container
      console.log(`[Restore] Copying SQL file to container ${container}...`)
      await execAsync(`docker cp "${sqlPath}" ${container}:/tmp/restore.sql`)

      // Step 9: Execute restore
      console.log('[Restore] Executing database restore...')

      // Terminate existing connections (except our own)
      const terminateCmd = `docker exec ${container} psql -U ${dbUser} -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${dbName}' AND pid <> pg_backend_pid();"`
      try {
        await execAsync(terminateCmd)
      } catch {
        // Ignore errors if no connections to terminate
      }

      // Drop and recreate database
      console.log('[Restore] Dropping and recreating database...')
      const dropCmd = `docker exec ${container} psql -U ${dbUser} -d postgres -c "DROP DATABASE IF EXISTS ${dbName};"`
      await execAsync(dropCmd)

      const createCmd = `docker exec ${container} psql -U ${dbUser} -d postgres -c "CREATE DATABASE ${dbName} OWNER ${dbUser};"`
      await execAsync(createCmd)

      // Restore from SQL file
      console.log('[Restore] Importing SQL dump...')
      const restoreCmd = `docker exec ${container} psql -U ${dbUser} -d ${dbName} -f /tmp/restore.sql`
      const { stderr } = await execAsync(restoreCmd)

      if (stderr && !stderr.includes('NOTICE')) {
        console.warn('[Restore] Restore warnings:', stderr)
      }

      // Step 10: Cleanup temp files
      console.log('[Restore] Cleaning up temporary files...')
      await execAsync(`docker exec ${container} rm -f /tmp/restore.sql`)
      for (const file of tempFiles) {
        await fs.unlink(file).catch(() => {})
      }

      // Step 11: Verify restore if requested
      let tablesRestored: number | undefined
      if (!skipVerification) {
        console.log('[Restore] Verifying restore...')
        const verifyCmd = `docker exec ${container} psql -U ${dbUser} -d ${dbName} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"`
        const { stdout } = await execAsync(verifyCmd)
        tablesRestored = parseInt(stdout.trim(), 10)

        if (tablesRestored === 0) {
          throw new Error('Restore verification failed: No tables found in database')
        }
        console.log(`[Restore] Verified: ${tablesRestored} tables restored`)
      }

      const durationMs = Date.now() - startTime

      // Send success notification
      await backupNotificationService.notifyRestoreResult({
        success: true,
        filename,
        message: `Database restored successfully from ${filename}`,
        durationMs,
        preRestoreBackup: preRestoreBackupName,
      })

      return {
        success: true,
        message: `Database restored successfully from ${filename}`,
        preRestoreBackup: preRestoreBackupName,
        restoredFrom: filename,
        durationMs,
        tablesRestored,
      }
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error('[Restore] Restore failed:', error)

      // Cleanup temp files on error
      for (const file of tempFiles) {
        await fs.unlink(file).catch(() => {})
      }

      // Send failure notification
      await backupNotificationService.notifyRestoreResult({
        success: false,
        filename,
        message: `Restore failed: ${errorMessage}`,
        durationMs,
        preRestoreBackup: preRestoreBackupName,
        error: errorMessage,
      })

      return {
        success: false,
        message: `Restore failed: ${errorMessage}`,
        preRestoreBackup: preRestoreBackupName,
        restoredFrom: filename,
        durationMs,
      }
    }
  }

  /**
   * Get list of available backups for restore
   */
  async getRestorableBackups(): Promise<Array<{
    filename: string
    size: number
    createdAt: Date
    ageInDays: number
    isEncrypted: boolean
  }>> {
    const storage = getBackupStorage()
    const backups = await storage.list('database')

    return backups.map(backup => ({
      filename: backup.filename,
      size: backup.size,
      createdAt: backup.createdAt,
      ageInDays: Math.floor((Date.now() - backup.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      isEncrypted: backup.isEncrypted,
    }))
  }
}

// Singleton export
export const restoreService = new RestoreService()
