/**
 * Backup Encryption Service
 *
 * Provides AES-256-GCM encryption for backup files.
 * Uses Node.js built-in crypto module.
 *
 * File format for encrypted files:
 * [16 bytes: IV][N bytes: encrypted data][16 bytes: auth tag]
 */

import * as crypto from 'crypto';
import * as fs from 'fs/promises';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const KEY_LENGTH = 32; // 256 bits

export interface EncryptionResult {
  encryptedPath: string;
  iv: string; // hex encoded
  authTag: string; // hex encoded
}

export interface DecryptionResult {
  decryptedPath: string;
}

/**
 * Check if encryption is enabled via environment variable
 */
export function isEncryptionEnabled(): boolean {
  return !!process.env.BACKUP_ENCRYPTION_KEY;
}

/**
 * Derive encryption key from environment variable
 *
 * Supports two formats:
 * - 64-character hex string (32 bytes / 256 bits) - used directly
 * - Any other string - derived using PBKDF2
 */
export function deriveKey(): Buffer {
  const keyEnv = process.env.BACKUP_ENCRYPTION_KEY;
  if (!keyEnv) {
    throw new Error('BACKUP_ENCRYPTION_KEY environment variable not set');
  }

  // If key is 64 hex chars (32 bytes), use directly
  if (/^[0-9a-fA-F]{64}$/.test(keyEnv)) {
    return Buffer.from(keyEnv, 'hex');
  }

  // Otherwise, derive key using PBKDF2 with static salt
  // Salt is static because we need deterministic key derivation
  const salt = Buffer.from('kanbu-backup-encryption-salt-v1');
  return crypto.pbkdf2Sync(keyEnv, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Encrypt a file using AES-256-GCM
 *
 * @param inputPath - Path to the file to encrypt
 * @param outputPath - Optional output path (defaults to inputPath + '.enc')
 * @returns EncryptionResult with path and metadata
 */
export async function encryptFile(
  inputPath: string,
  outputPath?: string
): Promise<EncryptionResult> {
  const key = deriveKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const input = await fs.readFile(inputPath);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);

  const authTag = cipher.getAuthTag();

  // File format: [IV][encrypted data][auth tag]
  const output = Buffer.concat([iv, encrypted, authTag]);

  const encryptedPath = outputPath || `${inputPath}.enc`;
  await fs.writeFile(encryptedPath, output);

  return {
    encryptedPath,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt a file encrypted with AES-256-GCM
 *
 * @param inputPath - Path to the encrypted file
 * @param outputPath - Optional output path (defaults to inputPath without '.enc')
 * @returns DecryptionResult with decrypted file path
 */
export async function decryptFile(
  inputPath: string,
  outputPath?: string
): Promise<DecryptionResult> {
  const key = deriveKey();
  const input = await fs.readFile(inputPath);

  // Extract IV, encrypted data, and auth tag
  const iv = input.subarray(0, IV_LENGTH);
  const authTag = input.subarray(input.length - AUTH_TAG_LENGTH);
  const encrypted = input.subarray(IV_LENGTH, input.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

  const decryptedPath = outputPath || inputPath.replace(/\.enc$/, '');
  await fs.writeFile(decryptedPath, decrypted);

  return { decryptedPath };
}

/**
 * Check if a filename indicates an encrypted file
 */
export function isEncryptedFile(filename: string): boolean {
  return filename.endsWith('.enc');
}

/**
 * Get encryption algorithm name for metadata
 */
export function getEncryptionAlgorithm(): string {
  return ALGORITHM;
}
