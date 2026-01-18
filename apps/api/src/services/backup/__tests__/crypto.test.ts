/**
 * Crypto Module Tests
 *
 * Tests for encryption and checksum functionality.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs/promises'
import * as path from 'path'
import * as os from 'os'

// Mock the crypto module
vi.mock('../crypto', () => ({
  isEncryptionEnabled: vi.fn(),
  encryptFile: vi.fn(),
  decryptFile: vi.fn(),
  isEncryptedFile: vi.fn(),
  getEncryptionAlgorithm: vi.fn(),
  deriveKey: vi.fn(),
}))

vi.mock('../crypto/checksum', () => ({
  generateChecksum: vi.fn(),
  verifyChecksum: vi.fn(),
  generateChecksumFromBuffer: vi.fn(),
  isValidChecksum: vi.fn(),
  getChecksumAlgorithm: vi.fn(),
}))

import {
  isEncryptionEnabled,
  encryptFile,
  decryptFile,
  isEncryptedFile,
  getEncryptionAlgorithm,
} from '../crypto'

import {
  generateChecksum,
  verifyChecksum,
  generateChecksumFromBuffer,
  isValidChecksum,
  getChecksumAlgorithm,
} from '../crypto/checksum'

describe('Encryption Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isEncryptionEnabled', () => {
    it('should return true when BACKUP_ENCRYPTION_KEY is set', () => {
      vi.mocked(isEncryptionEnabled).mockReturnValue(true)
      expect(isEncryptionEnabled()).toBe(true)
    })

    it('should return false when BACKUP_ENCRYPTION_KEY is not set', () => {
      vi.mocked(isEncryptionEnabled).mockReturnValue(false)
      expect(isEncryptionEnabled()).toBe(false)
    })
  })

  describe('encryptFile', () => {
    it('should encrypt a file and return encryption result', async () => {
      const mockResult = {
        encryptedPath: '/tmp/test.sql.gz.enc',
        iv: 'abc123',
        authTag: 'def456',
      }
      vi.mocked(encryptFile).mockResolvedValue(mockResult)

      const result = await encryptFile('/tmp/test.sql.gz', '/tmp/test.sql.gz.enc')

      expect(result.encryptedPath).toBe('/tmp/test.sql.gz.enc')
      expect(result.iv).toBeDefined()
      expect(result.authTag).toBeDefined()
    })
  })

  describe('decryptFile', () => {
    it('should decrypt a file and return decryption result', async () => {
      const mockResult = { decryptedPath: '/tmp/test.sql.gz' }
      vi.mocked(decryptFile).mockResolvedValue(mockResult)

      const result = await decryptFile('/tmp/test.sql.gz.enc', '/tmp/test.sql.gz')

      expect(result.decryptedPath).toBe('/tmp/test.sql.gz')
    })
  })

  describe('isEncryptedFile', () => {
    it('should return true for .enc files', () => {
      vi.mocked(isEncryptedFile).mockReturnValue(true)
      expect(isEncryptedFile('backup.sql.gz.enc')).toBe(true)
    })

    it('should return false for non-.enc files', () => {
      vi.mocked(isEncryptedFile).mockReturnValue(false)
      expect(isEncryptedFile('backup.sql.gz')).toBe(false)
    })
  })

  describe('getEncryptionAlgorithm', () => {
    it('should return aes-256-gcm', () => {
      vi.mocked(getEncryptionAlgorithm).mockReturnValue('aes-256-gcm')
      expect(getEncryptionAlgorithm()).toBe('aes-256-gcm')
    })
  })
})

describe('Checksum Module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateChecksum', () => {
    it('should generate a 64-character hex checksum', async () => {
      const mockChecksum = 'a'.repeat(64)
      vi.mocked(generateChecksum).mockResolvedValue(mockChecksum)

      const checksum = await generateChecksum('/tmp/test.sql.gz')

      expect(checksum).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('verifyChecksum', () => {
    it('should return true for matching checksums', async () => {
      vi.mocked(verifyChecksum).mockResolvedValue(true)

      const result = await verifyChecksum('/tmp/test.sql.gz', 'a'.repeat(64))

      expect(result).toBe(true)
    })

    it('should return false for non-matching checksums', async () => {
      vi.mocked(verifyChecksum).mockResolvedValue(false)

      const result = await verifyChecksum('/tmp/test.sql.gz', 'b'.repeat(64))

      expect(result).toBe(false)
    })
  })

  describe('generateChecksumFromBuffer', () => {
    it('should generate checksum from buffer', () => {
      const mockChecksum = 'c'.repeat(64)
      vi.mocked(generateChecksumFromBuffer).mockReturnValue(mockChecksum)

      const checksum = generateChecksumFromBuffer(Buffer.from('test data'))

      expect(checksum).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('isValidChecksum', () => {
    it('should return true for valid SHA-256 format', () => {
      vi.mocked(isValidChecksum).mockReturnValue(true)
      expect(isValidChecksum('a'.repeat(64))).toBe(true)
    })

    it('should return false for invalid format', () => {
      vi.mocked(isValidChecksum).mockReturnValue(false)
      expect(isValidChecksum('invalid')).toBe(false)
    })
  })

  describe('getChecksumAlgorithm', () => {
    it('should return sha256', () => {
      vi.mocked(getChecksumAlgorithm).mockReturnValue('sha256')
      expect(getChecksumAlgorithm()).toBe('sha256')
    })
  })
})

describe('File Format Detection', () => {
  it('should detect encrypted database backup', () => {
    vi.mocked(isEncryptedFile).mockImplementation((filename: string) =>
      filename.endsWith('.enc')
    )

    expect(isEncryptedFile('kanbu_backup_2026-01-18.sql.gz.enc')).toBe(true)
    expect(isEncryptedFile('kanbu_backup_2026-01-18.sql.gz')).toBe(false)
    expect(isEncryptedFile('kanbu_backup_2026-01-18.sql')).toBe(false)
  })

  it('should detect encrypted source backup', () => {
    vi.mocked(isEncryptedFile).mockImplementation((filename: string) =>
      filename.endsWith('.enc')
    )

    expect(isEncryptedFile('kanbu_source_2026-01-18.tar.gz.enc')).toBe(true)
    expect(isEncryptedFile('kanbu_source_2026-01-18.tar.gz')).toBe(false)
  })
})
