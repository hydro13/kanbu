/**
 * Backup Storage Factory
 *
 * Returns the appropriate storage backend based on configuration.
 */

import { BackupStorage, getBackupConfig } from './types'
import { LocalStorageBackend } from './localStorageBackend'
import { GDriveStorageBackend } from './gdriveStorageBackend'

// Export types
export * from './types'
export { LocalStorageBackend } from './localStorageBackend'
export { GDriveStorageBackend } from './gdriveStorageBackend'

// Singleton instance
let storageInstance: BackupStorage | null = null

/**
 * Get the configured backup storage backend
 *
 * Uses BACKUP_STORAGE environment variable:
 * - 'local' (default): Local filesystem storage
 * - 'gdrive': Google Drive via rclone mount
 */
export function getBackupStorage(): BackupStorage {
  if (storageInstance) {
    return storageInstance
  }

  const config = getBackupConfig()

  switch (config.storage) {
    case 'gdrive':
      storageInstance = new GDriveStorageBackend(config.gdrivePath)
      break
    case 'local':
    default:
      storageInstance = new LocalStorageBackend(config.localPath)
      break
  }

  return storageInstance
}

/**
 * Check if backup storage is properly configured
 */
export async function isBackupStorageConfigured(): Promise<boolean> {
  try {
    const storage = getBackupStorage()
    return await storage.isAccessible()
  } catch {
    return false
  }
}

/**
 * Get storage type name for display
 */
export function getBackupStorageType(): string {
  const config = getBackupConfig()
  return config.storage === 'gdrive' ? 'Google Drive' : 'Local Storage'
}

/**
 * Reset storage instance (for testing)
 */
export function resetBackupStorage(): void {
  storageInstance = null
}
