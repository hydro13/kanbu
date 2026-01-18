/**
 * Backup Service
 *
 * Main orchestration service for database and source code backups.
 * Supports multiple storage backends and dynamic container discovery.
 *
 * Phase 4.1 + 4.4: Supports optional AES-256-GCM encryption and SHA-256 checksums.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import {
  getBackupStorage,
  getBackupStorageType,
  type BackupStorage,
  type BackupResult,
  type BackupFile,
  getBackupConfig,
} from './storage'
import { execPgDump, getPostgresBackupInfo } from './container/dockerDiscovery'
import {
  isEncryptionEnabled,
  encryptFile,
  getEncryptionAlgorithm,
} from './crypto'
import { generateChecksum, getChecksumAlgorithm } from './crypto/checksum'

const execAsync = promisify(exec)

export class BackupService {
  private storage: BackupStorage

  constructor() {
    this.storage = getBackupStorage()
  }

  /**
   * Create a database backup
   *
   * Pipeline:
   * 1. pg_dump → .sql file
   * 2. gzip compression → .sql.gz file
   * 3. Generate SHA-256 checksum (BEFORE encryption)
   * 4. Optional AES-256-GCM encryption → .sql.gz.enc file
   * 5. Store via configured backend
   */
  async createDatabaseBackup(): Promise<BackupResult> {
    const timestamp = this.generateTimestamp()
    const baseFilename = `kanbu_backup_${timestamp}`
    const tempSqlFile = path.join('/tmp', `${baseFilename}.sql`)
    const tempGzFile = path.join('/tmp', `${baseFilename}.sql.gz`)
    const tempEncFile = path.join('/tmp', `${baseFilename}.sql.gz.enc`)
    const tempFiles: string[] = []

    try {
      // Check storage accessibility
      const storageOk = await this.storage.isAccessible()
      if (!storageOk) {
        throw new Error(
          `Backup storage not accessible at ${this.storage.getPath()}. ` +
          `Storage type: ${getBackupStorageType()}`
        )
      }

      // Step 1: Execute pg_dump
      const { success, stderr } = await execPgDump(tempSqlFile)
      if (!success) {
        throw new Error(`pg_dump failed: ${stderr}`)
      }
      tempFiles.push(tempSqlFile)

      // Step 2: Compress with gzip
      await execAsync(`gzip -c "${tempSqlFile}" > "${tempGzFile}"`)
      tempFiles.push(tempGzFile)

      // Step 3: Generate SHA-256 checksum of compressed file (BEFORE encryption)
      const checksum = await generateChecksum(tempGzFile)
      const checksumAlg = getChecksumAlgorithm()

      // Get compressed file stats
      const gzStats = await fs.stat(tempGzFile)
      const fileSizeKB = Math.round(gzStats.size / 1024)

      // Step 4: Optional encryption
      let finalFilename: string
      let finalTempFile: string
      let isEncrypted = false
      let encryptionAlg: string | undefined

      if (isEncryptionEnabled()) {
        // Encrypt the compressed file
        const encResult = await encryptFile(tempGzFile, tempEncFile)
        tempFiles.push(encResult.encryptedPath)
        finalTempFile = encResult.encryptedPath
        finalFilename = `${baseFilename}.sql.gz.enc`
        isEncrypted = true
        encryptionAlg = getEncryptionAlgorithm()
      } else {
        // No encryption, use compressed file directly
        finalTempFile = tempGzFile
        finalFilename = `${baseFilename}.sql.gz`
      }

      // Step 5: Save to storage backend
      await this.storage.saveFromFile(finalTempFile, finalFilename)

      // Clean up temp files
      for (const file of tempFiles) {
        await fs.unlink(file).catch(() => {})
      }

      // Count existing backups
      const backups = await this.storage.list('database')
      const totalBackups = backups.length

      return {
        success: true,
        fileName: finalFilename,
        timestamp,
        fileSizeKB,
        totalBackups,
        storagePath: this.storage.getPath(),
        message: `Database backup saved to ${getBackupStorageType()}: ${finalFilename}`,
        isEncrypted,
        encryptionAlg,
        checksum,
        checksumAlg,
      }
    } catch (error) {
      // Clean up temp files on error
      for (const file of tempFiles) {
        await fs.unlink(file).catch(() => {})
      }
      throw error
    }
  }

  /**
   * Create a source code backup
   *
   * Pipeline:
   * 1. tar.gz archive of Kanbu source code
   * 2. Generate SHA-256 checksum (BEFORE encryption)
   * 3. Optional AES-256-GCM encryption → .tar.gz.enc file
   * 4. Store via configured backend
   *
   * Only available when KANBU_SOURCE_PATH is set and accessible.
   */
  async createSourceBackup(): Promise<BackupResult> {
    const config = getBackupConfig()
    const timestamp = this.generateTimestamp()
    const baseFilename = `kanbu_source_${timestamp}`
    const tempTarGzFile = path.join('/tmp', `${baseFilename}.tar.gz`)
    const tempEncFile = path.join('/tmp', `${baseFilename}.tar.gz.enc`)
    const tempFiles: string[] = []

    try {
      // Check if source path exists
      try {
        await fs.access(config.sourcePath)
      } catch {
        throw new Error(
          `Source path not accessible: ${config.sourcePath}. ` +
          'Set KANBU_SOURCE_PATH to the correct location.'
        )
      }

      // Check storage accessibility
      const storageOk = await this.storage.isAccessible()
      if (!storageOk) {
        throw new Error(
          `Backup storage not accessible at ${this.storage.getPath()}. ` +
          `Storage type: ${getBackupStorageType()}`
        )
      }

      // Step 1: Create tar.gz archive
      const excludePatterns = [
        'node_modules',
        '.git',
        '.turbo',
        'dist',
        '.next',
        '*.log',
        '.env.local',
        '.DS_Store',
        'coverage',
        '.nyc_output',
      ].map(p => `--exclude='${p}'`).join(' ')

      const parentDir = path.dirname(config.sourcePath)
      const baseName = path.basename(config.sourcePath)

      const { stderr: tarErr } = await execAsync(
        `cd "${parentDir}" && tar ${excludePatterns} -czf "${tempTarGzFile}" "${baseName}"`,
        { shell: '/bin/bash', maxBuffer: 50 * 1024 * 1024 }
      )

      // tar warnings about "Removing leading" are not errors
      if (tarErr && !tarErr.includes('Removing leading')) {
        console.warn('tar warning:', tarErr)
      }
      tempFiles.push(tempTarGzFile)

      // Step 2: Generate SHA-256 checksum (BEFORE encryption)
      const checksum = await generateChecksum(tempTarGzFile)
      const checksumAlg = getChecksumAlgorithm()

      // Get archive stats
      const stats = await fs.stat(tempTarGzFile)
      const fileSizeMB = Math.round(stats.size / (1024 * 1024) * 10) / 10

      // Step 3: Optional encryption
      let finalFilename: string
      let finalTempFile: string
      let isEncrypted = false
      let encryptionAlg: string | undefined

      if (isEncryptionEnabled()) {
        // Encrypt the archive
        const encResult = await encryptFile(tempTarGzFile, tempEncFile)
        tempFiles.push(encResult.encryptedPath)
        finalTempFile = encResult.encryptedPath
        finalFilename = `${baseFilename}.tar.gz.enc`
        isEncrypted = true
        encryptionAlg = getEncryptionAlgorithm()
      } else {
        // No encryption, use archive directly
        finalTempFile = tempTarGzFile
        finalFilename = `${baseFilename}.tar.gz`
      }

      // Step 4: Save to storage backend
      await this.storage.saveFromFile(finalTempFile, finalFilename)

      // Clean up temp files
      for (const file of tempFiles) {
        await fs.unlink(file).catch(() => {})
      }

      // Count existing backups
      const backups = await this.storage.list('source')
      const totalBackups = backups.length

      // Instructions vary based on encryption
      const extractFilename = isEncrypted
        ? `${baseFilename}.tar.gz`
        : finalFilename
      const instructions = isEncrypted
        ? [
            '1. Download the archive from backup storage',
            '2. Decrypt using the encryption key',
            `3. Extract: tar -xzf ${extractFilename}`,
            '4. cd kanbu && pnpm install',
            '5. Copy .env files and configure for your environment',
            '6. pnpm db:push && pnpm build && pnpm start',
          ]
        : [
            '1. Download the archive from backup storage',
            `2. Extract: tar -xzf ${finalFilename}`,
            '3. cd kanbu && pnpm install',
            '4. Copy .env files and configure for your environment',
            '5. pnpm db:push && pnpm build && pnpm start',
          ]

      return {
        success: true,
        fileName: finalFilename,
        timestamp,
        fileSizeMB,
        totalBackups,
        storagePath: this.storage.getPath(),
        message: `Source backup saved to ${getBackupStorageType()}: ${finalFilename}`,
        instructions,
        isEncrypted,
        encryptionAlg,
        checksum,
        checksumAlg,
      }
    } catch (error) {
      // Clean up temp files on error
      for (const file of tempFiles) {
        await fs.unlink(file).catch(() => {})
      }
      throw error
    }
  }

  /**
   * List all backups
   */
  async listBackups(): Promise<{ database: BackupFile[]; source: BackupFile[] }> {
    const [database, source] = await Promise.all([
      this.storage.list('database'),
      this.storage.list('source'),
    ])
    return { database, source }
  }

  /**
   * Delete a backup file
   */
  async deleteBackup(filename: string): Promise<void> {
    await this.storage.delete(filename)
  }

  /**
   * Download a backup file
   */
  async downloadBackup(filename: string): Promise<Buffer> {
    return this.storage.download(filename)
  }

  /**
   * Get backup system status
   */
  async getStatus(): Promise<{
    storageType: string
    storagePath: string
    storageAccessible: boolean
    postgres: {
      available: boolean
      mode: 'direct' | 'docker' | 'none'
      details: {
        pgDumpAvailable: boolean
        databaseUrlSet: boolean
        dockerAvailable: boolean
        containerFound: boolean
        containerName: string | null
      }
    }
    backupCounts: {
      database: number
      source: number
    }
    encryption: {
      enabled: boolean
      algorithm: string
    }
    checksum: {
      algorithm: string
    }
  }> {
    const [storageAccessible, backupInfo, backups] = await Promise.all([
      this.storage.isAccessible(),
      getPostgresBackupInfo(),
      this.listBackups(),
    ])

    return {
      storageType: getBackupStorageType(),
      storagePath: this.storage.getPath(),
      storageAccessible,
      postgres: {
        available: backupInfo.available,
        mode: backupInfo.mode,
        details: backupInfo.details,
      },
      backupCounts: {
        database: backups.database.length,
        source: backups.source.length,
      },
      encryption: {
        enabled: isEncryptionEnabled(),
        algorithm: getEncryptionAlgorithm(),
      },
      checksum: {
        algorithm: getChecksumAlgorithm(),
      },
    }
  }

  /**
   * Generate ISO timestamp for filenames
   */
  private generateTimestamp(): string {
    return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  }
}

// Singleton export
export const backupService = new BackupService()
