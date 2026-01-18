/**
 * Backup Verification Service
 *
 * Provides integrity verification for backups using SHA-256 checksums.
 * Compares stored checksums with actual file checksums.
 *
 * Phase 4.4: Backup Verification
 */

import { prisma } from '../../../lib/prisma'
import { getBackupStorage } from '../storage'
import { generateChecksum } from '../crypto/checksum'
import { isEncryptedFile, decryptFile, isEncryptionEnabled } from '../crypto'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

export interface VerificationResult {
  filename: string
  success: boolean
  message: string
  expectedChecksum?: string
  actualChecksum?: string
  verifiedAt: Date
}

export interface VerificationStats {
  total: number
  verified: number
  pending: number
  failed: number
  noChecksum: number
}

export interface BatchVerificationResult {
  results: VerificationResult[]
  stats: {
    total: number
    success: number
    failed: number
    skipped: number
  }
}

export class VerificationService {
  /**
   * Verify a single backup file
   *
   * For encrypted files, decrypts first then verifies checksum.
   * Updates the verified/verifiedAt fields in the database.
   */
  async verifyBackup(filename: string): Promise<VerificationResult> {
        const storage = getBackupStorage()
    const now = new Date()
    const tempFiles: string[] = []

    try {
      // Get backup execution record
      const execution = await prisma.backupExecution.findFirst({
        where: { filename },
        select: {
          id: true,
          checksum: true,
          isEncrypted: true,
        },
      })

      if (!execution) {
        return {
          filename,
          success: false,
          message: 'Backup execution record not found in database',
          verifiedAt: now,
        }
      }

      if (!execution.checksum) {
        // No checksum stored - cannot verify
        return {
          filename,
          success: false,
          message: 'No checksum stored for this backup - cannot verify integrity',
          verifiedAt: now,
        }
      }

      // Check if file is encrypted and we can decrypt it
      const isEncrypted = isEncryptedFile(filename)
      if (isEncrypted && !isEncryptionEnabled()) {
        return {
          filename,
          success: false,
          message: 'Backup is encrypted but BACKUP_ENCRYPTION_KEY is not set',
          expectedChecksum: execution.checksum,
          verifiedAt: now,
        }
      }

      // Download the backup file
      const backupData = await storage.download(filename)
      const tempDir = os.tmpdir()
      let currentPath = path.join(tempDir, filename)
      await fs.writeFile(currentPath, backupData)
      tempFiles.push(currentPath)

      // Decrypt if needed (checksum was generated BEFORE encryption)
      if (isEncrypted) {
        const decryptedPath = currentPath.replace('.enc', '')
        await decryptFile(currentPath, decryptedPath)
        currentPath = decryptedPath
        tempFiles.push(currentPath)
      }

      // Generate checksum of the file
      const actualChecksum = await generateChecksum(currentPath)

      // Compare checksums
      const isValid = actualChecksum.toLowerCase() === execution.checksum.toLowerCase()

      // Update database record
      await prisma.backupExecution.update({
        where: { id: execution.id },
        data: {
          verified: isValid,
          verifiedAt: now,
        },
      })

      // Cleanup temp files
      for (const file of tempFiles) {
        await fs.unlink(file).catch(() => {})
      }

      if (isValid) {
        return {
          filename,
          success: true,
          message: 'Checksum verification successful',
          expectedChecksum: execution.checksum,
          actualChecksum,
          verifiedAt: now,
        }
      } else {
        return {
          filename,
          success: false,
          message: 'Checksum mismatch - backup may be corrupted or tampered',
          expectedChecksum: execution.checksum,
          actualChecksum,
          verifiedAt: now,
        }
      }
    } catch (error) {
      // Cleanup temp files on error
      for (const file of tempFiles) {
        await fs.unlink(file).catch(() => {})
      }

      const errorMessage = error instanceof Error ? error.message : String(error)
      return {
        filename,
        success: false,
        message: `Verification failed: ${errorMessage}`,
        verifiedAt: now,
      }
    }
  }

  /**
   * Verify all backups that haven't been verified yet
   *
   * Only verifies backups that have a stored checksum.
   */
  async verifyAllPending(): Promise<BatchVerificationResult> {
    
    // Get all unverified backups with checksums
    const pendingBackups = await prisma.backupExecution.findMany({
      where: {
        checksum: { not: null },
        verified: null, // Not yet verified
        status: 'COMPLETED',
      },
      select: {
        filename: true,
      },
      orderBy: { startedAt: 'desc' },
    })

    const results: VerificationResult[] = []
    let success = 0
    let failed = 0
    let skipped = 0

    for (const backup of pendingBackups) {
      if (!backup.filename) {
        skipped++
        continue
      }

      const result = await this.verifyBackup(backup.filename)
      results.push(result)

      if (result.success) {
        success++
      } else {
        failed++
      }
    }

    return {
      results,
      stats: {
        total: pendingBackups.length,
        success,
        failed,
        skipped,
      },
    }
  }

  /**
   * Get verification statistics across all backups
   */
  async getVerificationStats(): Promise<VerificationStats> {
    
    // Get all completed backup executions
    const backups = await prisma.backupExecution.findMany({
      where: { status: 'COMPLETED' },
      select: {
        checksum: true,
        verified: true,
      },
    })

    let total = backups.length
    let verified = 0
    let pending = 0
    let failed = 0
    let noChecksum = 0

    for (const backup of backups) {
      if (!backup.checksum) {
        noChecksum++
      } else if (backup.verified === true) {
        verified++
      } else if (backup.verified === false) {
        failed++
      } else {
        pending++
      }
    }

    return {
      total,
      verified,
      pending,
      failed,
      noChecksum,
    }
  }

  /**
   * Quick integrity check using file existence and size
   *
   * Does not download or compute checksums - just verifies the file
   * exists in storage and matches the expected size.
   */
  async quickCheck(filename: string): Promise<{
    exists: boolean
    sizeMatch: boolean
    expectedSize?: number
    actualSize?: number
  }> {
        const storage = getBackupStorage()

    try {
      // Get expected size from database
      const execution = await prisma.backupExecution.findFirst({
        where: { filename },
        select: { fileSize: true },
      })

      // Get actual file from storage
      const backups = await storage.list('database')
      const backup = backups.find(b => b.filename === filename)

      if (!backup) {
        // Try source backups
        const sourceBackups = await storage.list('source')
        const sourceBackup = sourceBackups.find(b => b.filename === filename)

        if (!sourceBackup) {
          return {
            exists: false,
            sizeMatch: false,
            expectedSize: execution?.fileSize ?? undefined,
          }
        }

        return {
          exists: true,
          sizeMatch: execution?.fileSize === sourceBackup.size,
          expectedSize: execution?.fileSize ?? undefined,
          actualSize: sourceBackup.size,
        }
      }

      return {
        exists: true,
        sizeMatch: execution?.fileSize === backup.size,
        expectedSize: execution?.fileSize ?? undefined,
        actualSize: backup.size,
      }
    } catch (error) {
      return {
        exists: false,
        sizeMatch: false,
      }
    }
  }
}

// Singleton export
export const verificationService = new VerificationService()
