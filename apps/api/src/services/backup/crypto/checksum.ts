/**
 * Backup Checksum Service
 *
 * Provides SHA-256 checksum generation and verification for backup integrity.
 * Uses Node.js built-in crypto module with streaming for large files.
 */

import * as crypto from 'crypto'
import * as fs from 'fs'

const ALGORITHM = 'sha256'

/**
 * Generate SHA-256 checksum of a file using streaming
 *
 * @param filePath - Path to the file
 * @returns Hex-encoded SHA-256 hash (64 characters)
 */
export async function generateChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash(ALGORITHM)
    const stream = fs.createReadStream(filePath)

    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

/**
 * Verify a file's checksum against an expected value
 *
 * @param filePath - Path to the file to verify
 * @param expectedChecksum - Expected SHA-256 hex string
 * @returns true if checksums match, false otherwise
 */
export async function verifyChecksum(
  filePath: string,
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await generateChecksum(filePath)
  return actualChecksum.toLowerCase() === expectedChecksum.toLowerCase()
}

/**
 * Generate checksum from a Buffer (for small data)
 *
 * @param data - Buffer to hash
 * @returns Hex-encoded SHA-256 hash
 */
export function generateChecksumFromBuffer(data: Buffer): string {
  return crypto.createHash(ALGORITHM).update(data).digest('hex')
}

/**
 * Check if a string is a valid SHA-256 checksum format
 *
 * @param checksum - String to validate
 * @returns true if valid SHA-256 hex format
 */
export function isValidChecksum(checksum: string): boolean {
  return /^[a-f0-9]{64}$/i.test(checksum)
}

/**
 * Get checksum algorithm name for metadata
 */
export function getChecksumAlgorithm(): string {
  return ALGORITHM
}
