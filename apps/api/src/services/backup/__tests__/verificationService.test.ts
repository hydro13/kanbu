/**
 * Verification Service Tests
 *
 * Tests for backup verification functionality.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock dependencies
vi.mock('../../../lib/prisma', () => ({
  prisma: {
    backupExecution: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('../storage', () => ({
  getBackupStorage: vi.fn(),
}))

vi.mock('../crypto', () => ({
  isEncryptedFile: vi.fn(),
  isEncryptionEnabled: vi.fn(),
  decryptFile: vi.fn(),
}))

vi.mock('../crypto/checksum', () => ({
  generateChecksum: vi.fn(),
}))

vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
}))

import { prisma } from '../../../lib/prisma'
import { getBackupStorage } from '../storage'
import { isEncryptedFile, isEncryptionEnabled, decryptFile } from '../crypto'
import { generateChecksum } from '../crypto/checksum'
import fs from 'fs/promises'

// Import after mocks
import { VerificationService, type VerificationResult, type VerificationStats } from '../verification'

describe('VerificationService', () => {
  let service: VerificationService
  let mockStorage: {
    download: ReturnType<typeof vi.fn>
    list: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    vi.clearAllMocks()
    service = new VerificationService()
    mockStorage = {
      download: vi.fn(),
      list: vi.fn(),
    }
    vi.mocked(getBackupStorage).mockReturnValue(mockStorage as any)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.unlink).mockResolvedValue(undefined)
  })

  describe('verifyBackup', () => {
    it('should return failure if backup record not found', async () => {
      vi.mocked(prisma.backupExecution.findFirst).mockResolvedValue(null)

      const result = await service.verifyBackup('nonexistent.sql.gz')

      expect(result.success).toBe(false)
      expect(result.message).toContain('not found')
    })

    it('should return failure if no checksum stored', async () => {
      vi.mocked(prisma.backupExecution.findFirst).mockResolvedValue({
        id: 1,
        checksum: null,
        isEncrypted: false,
      } as any)

      const result = await service.verifyBackup('backup.sql.gz')

      expect(result.success).toBe(false)
      expect(result.message).toContain('No checksum stored')
    })

    it('should return failure if encrypted but no key available', async () => {
      vi.mocked(prisma.backupExecution.findFirst).mockResolvedValue({
        id: 1,
        checksum: 'a'.repeat(64),
        isEncrypted: true,
      } as any)
      vi.mocked(isEncryptedFile).mockReturnValue(true)
      vi.mocked(isEncryptionEnabled).mockReturnValue(false)

      const result = await service.verifyBackup('backup.sql.gz.enc')

      expect(result.success).toBe(false)
      expect(result.message).toContain('BACKUP_ENCRYPTION_KEY')
    })

    it('should successfully verify a valid unencrypted backup', async () => {
      const expectedChecksum = 'a'.repeat(64)
      vi.mocked(prisma.backupExecution.findFirst).mockResolvedValue({
        id: 1,
        checksum: expectedChecksum,
        isEncrypted: false,
      } as any)
      vi.mocked(isEncryptedFile).mockReturnValue(false)
      mockStorage.download.mockResolvedValue(Buffer.from('backup data'))
      vi.mocked(generateChecksum).mockResolvedValue(expectedChecksum)
      vi.mocked(prisma.backupExecution.update).mockResolvedValue({} as any)

      const result = await service.verifyBackup('backup.sql.gz')

      expect(result.success).toBe(true)
      expect(result.message).toContain('successful')
      expect(result.actualChecksum).toBe(expectedChecksum)
    })

    it('should fail verification for checksum mismatch', async () => {
      const expectedChecksum = 'a'.repeat(64)
      const actualChecksum = 'b'.repeat(64)
      vi.mocked(prisma.backupExecution.findFirst).mockResolvedValue({
        id: 1,
        checksum: expectedChecksum,
        isEncrypted: false,
      } as any)
      vi.mocked(isEncryptedFile).mockReturnValue(false)
      mockStorage.download.mockResolvedValue(Buffer.from('backup data'))
      vi.mocked(generateChecksum).mockResolvedValue(actualChecksum)
      vi.mocked(prisma.backupExecution.update).mockResolvedValue({} as any)

      const result = await service.verifyBackup('backup.sql.gz')

      expect(result.success).toBe(false)
      expect(result.message).toContain('mismatch')
      expect(result.expectedChecksum).toBe(expectedChecksum)
      expect(result.actualChecksum).toBe(actualChecksum)
    })

    it('should decrypt before verifying encrypted backup', async () => {
      const expectedChecksum = 'a'.repeat(64)
      vi.mocked(prisma.backupExecution.findFirst).mockResolvedValue({
        id: 1,
        checksum: expectedChecksum,
        isEncrypted: true,
      } as any)
      vi.mocked(isEncryptedFile).mockReturnValue(true)
      vi.mocked(isEncryptionEnabled).mockReturnValue(true)
      mockStorage.download.mockResolvedValue(Buffer.from('encrypted data'))
      vi.mocked(decryptFile).mockResolvedValue({ decryptedPath: '/tmp/backup.sql.gz' })
      vi.mocked(generateChecksum).mockResolvedValue(expectedChecksum)
      vi.mocked(prisma.backupExecution.update).mockResolvedValue({} as any)

      const result = await service.verifyBackup('backup.sql.gz.enc')

      expect(decryptFile).toHaveBeenCalled()
      expect(result.success).toBe(true)
    })
  })

  describe('verifyAllPending', () => {
    it('should return empty results when no pending backups', async () => {
      vi.mocked(prisma.backupExecution.findMany).mockResolvedValue([])

      const result = await service.verifyAllPending()

      expect(result.results).toHaveLength(0)
      expect(result.stats.total).toBe(0)
    })

    it('should verify multiple pending backups', async () => {
      vi.mocked(prisma.backupExecution.findMany).mockResolvedValue([
        { filename: 'backup1.sql.gz' },
        { filename: 'backup2.sql.gz' },
      ] as any)

      // Mock individual verifyBackup calls
      const verifySpy = vi.spyOn(service, 'verifyBackup')
      verifySpy.mockResolvedValue({
        filename: 'backup.sql.gz',
        success: true,
        message: 'Verified',
        verifiedAt: new Date(),
      })

      const result = await service.verifyAllPending()

      expect(result.results).toHaveLength(2)
      expect(result.stats.success).toBe(2)
    })

    it('should skip backups without filename', async () => {
      vi.mocked(prisma.backupExecution.findMany).mockResolvedValue([
        { filename: null },
        { filename: 'backup.sql.gz' },
      ] as any)

      const verifySpy = vi.spyOn(service, 'verifyBackup')
      verifySpy.mockResolvedValue({
        filename: 'backup.sql.gz',
        success: true,
        message: 'Verified',
        verifiedAt: new Date(),
      })

      const result = await service.verifyAllPending()

      expect(result.stats.skipped).toBe(1)
      expect(result.stats.total).toBe(2)
    })
  })

  describe('getVerificationStats', () => {
    it('should return correct statistics', async () => {
      vi.mocked(prisma.backupExecution.findMany).mockResolvedValue([
        { checksum: 'abc', verified: true },
        { checksum: 'def', verified: false },
        { checksum: 'ghi', verified: null },
        { checksum: null, verified: null },
      ] as any)

      const stats = await service.getVerificationStats()

      expect(stats.total).toBe(4)
      expect(stats.verified).toBe(1)
      expect(stats.failed).toBe(1)
      expect(stats.pending).toBe(1)
      expect(stats.noChecksum).toBe(1)
    })

    it('should handle empty backup list', async () => {
      vi.mocked(prisma.backupExecution.findMany).mockResolvedValue([])

      const stats = await service.getVerificationStats()

      expect(stats.total).toBe(0)
      expect(stats.verified).toBe(0)
      expect(stats.failed).toBe(0)
      expect(stats.pending).toBe(0)
      expect(stats.noChecksum).toBe(0)
    })
  })

  describe('quickCheck', () => {
    it('should return exists=false when file not found', async () => {
      vi.mocked(prisma.backupExecution.findFirst).mockResolvedValue({
        fileSize: 1000,
      } as any)
      mockStorage.list.mockResolvedValue([])

      const result = await service.quickCheck('nonexistent.sql.gz')

      expect(result.exists).toBe(false)
      expect(result.sizeMatch).toBe(false)
    })

    it('should return sizeMatch=true when sizes match', async () => {
      const fileSize = 1000
      vi.mocked(prisma.backupExecution.findFirst).mockResolvedValue({
        fileSize,
      } as any)
      mockStorage.list.mockResolvedValue([
        { filename: 'backup.sql.gz', size: fileSize },
      ])

      const result = await service.quickCheck('backup.sql.gz')

      expect(result.exists).toBe(true)
      expect(result.sizeMatch).toBe(true)
      expect(result.expectedSize).toBe(fileSize)
      expect(result.actualSize).toBe(fileSize)
    })

    it('should return sizeMatch=false when sizes differ', async () => {
      vi.mocked(prisma.backupExecution.findFirst).mockResolvedValue({
        fileSize: 1000,
      } as any)
      mockStorage.list.mockResolvedValue([
        { filename: 'backup.sql.gz', size: 2000 },
      ])

      const result = await service.quickCheck('backup.sql.gz')

      expect(result.exists).toBe(true)
      expect(result.sizeMatch).toBe(false)
      expect(result.expectedSize).toBe(1000)
      expect(result.actualSize).toBe(2000)
    })
  })
})

describe('VerificationResult Types', () => {
  it('should have correct structure for success result', () => {
    const result: VerificationResult = {
      filename: 'backup.sql.gz',
      success: true,
      message: 'Checksum verification successful',
      expectedChecksum: 'a'.repeat(64),
      actualChecksum: 'a'.repeat(64),
      verifiedAt: new Date(),
    }

    expect(result.success).toBe(true)
    expect(result.expectedChecksum).toBe(result.actualChecksum)
  })

  it('should have correct structure for failure result', () => {
    const result: VerificationResult = {
      filename: 'backup.sql.gz',
      success: false,
      message: 'Checksum mismatch',
      expectedChecksum: 'a'.repeat(64),
      actualChecksum: 'b'.repeat(64),
      verifiedAt: new Date(),
    }

    expect(result.success).toBe(false)
    expect(result.expectedChecksum).not.toBe(result.actualChecksum)
  })
})

describe('VerificationStats Types', () => {
  it('should have correct structure', () => {
    const stats: VerificationStats = {
      total: 10,
      verified: 5,
      pending: 3,
      failed: 1,
      noChecksum: 1,
    }

    expect(stats.total).toBe(stats.verified + stats.pending + stats.failed + stats.noChecksum)
  })
})
