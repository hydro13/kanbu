/**
 * Backup Service Exports
 *
 * Central export hub for backup functionality.
 */

// Main service
export { BackupService, backupService } from './backupService'

// Storage types and factory
export type {
  BackupStorage,
  BackupFile,
  BackupType,
  BackupResult,
  BackupConfig,
} from './storage'

export {
  getBackupConfig,
  getBackupStorage,
  getBackupStorageType,
  isBackupStorageConfigured,
  resetBackupStorage,
  LocalStorageBackend,
  GDriveStorageBackend,
} from './storage'

// Container discovery / PostgreSQL backup
export {
  findPostgresContainer,
  execPgDump,
  getPostgresBackupInfo,
  getPostgresContainerInfo, // Deprecated: use getPostgresBackupInfo
} from './container/dockerDiscovery'

// Scheduler (Phase 3)
export {
  scheduleService,
  internalScheduler,
  retentionService,
  isValidCronExpression,
  calculateNextRun,
  describeCronExpression,
  getSchedulerMode,
  isInternalSchedulerEnabled,
  type CreateScheduleInput,
  type UpdateScheduleInput,
  type ExecutionResult,
  type SchedulerMode,
  type RetentionPolicy,
  type RetentionResult,
} from './scheduler'

// Notifications (Phase 3)
export {
  backupNotificationService,
  type WebhookPayload,
} from './notifications'

// Restore (Phase 3)
export {
  restoreService,
  type RestoreOptions,
  type RestoreResult,
  type RestoreValidation,
} from './restore'

// Crypto (Phase 4.1 + 4.4)
export {
  isEncryptionEnabled,
  encryptFile,
  decryptFile,
  isEncryptedFile,
  getEncryptionAlgorithm,
} from './crypto'

export {
  generateChecksum,
  verifyChecksum,
  generateChecksumFromBuffer,
  isValidChecksum,
  getChecksumAlgorithm,
} from './crypto/checksum'

// Verification (Phase 4.4)
export {
  verificationService,
  type VerificationResult,
  type VerificationStats,
  type BatchVerificationResult,
} from './verification'
