/**
 * Backup Storage Types
 *
 * Interfaces for the backup storage system.
 * Supports multiple backends: local filesystem, Google Drive (via rclone mount).
 */

export type BackupType = 'database' | 'source';

export interface BackupFile {
  filename: string;
  size: number;
  createdAt: Date;
  type: BackupType;
  // Phase 4.1: Encryption metadata (detected from filename)
  isEncrypted: boolean;
}

export interface BackupStorage {
  /**
   * Save backup data to storage
   * @param data - Buffer containing backup data
   * @param filename - Target filename
   * @returns Full path where file was saved
   */
  save(data: Buffer, filename: string): Promise<string>;

  /**
   * Save backup from a file path (for large files)
   * @param sourcePath - Path to source file
   * @param filename - Target filename
   * @returns Full path where file was saved
   */
  saveFromFile(sourcePath: string, filename: string): Promise<string>;

  /**
   * List all backups of a specific type
   * @param type - 'database' or 'source'
   * @returns Array of backup files sorted by date (newest first)
   */
  list(type: BackupType): Promise<BackupFile[]>;

  /**
   * Delete a backup file
   * @param filename - Filename to delete
   */
  delete(filename: string): Promise<void>;

  /**
   * Download/read a backup file
   * @param filename - Filename to download
   * @returns Buffer containing file data
   */
  download(filename: string): Promise<Buffer>;

  /**
   * Get the storage path (for display/logging)
   */
  getPath(): string;

  /**
   * Check if storage is properly configured and accessible
   */
  isAccessible(): Promise<boolean>;
}

export interface BackupResult {
  success: boolean;
  fileName: string;
  timestamp: string;
  fileSizeKB?: number;
  fileSizeMB?: number;
  totalBackups: number;
  message: string;
  storagePath: string;
  instructions?: string[];
  // Phase 4.1: Encryption metadata
  isEncrypted?: boolean;
  encryptionAlg?: string;
  // Phase 4.4: Verification metadata
  checksum?: string;
  checksumAlg?: string;
}

export interface BackupConfig {
  storage: 'local' | 'gdrive';
  localPath: string;
  gdrivePath: string;
  postgresContainer: string | null;
  postgresContainerPattern: string;
  sourcePath: string;
  /** Environment name for subdirectory separation (e.g., 'dev', 'prod') */
  environment: string;
}

/**
 * Get backup configuration from environment variables
 */
export function getBackupConfig(): BackupConfig {
  // KANBU_ENVIRONMENT determines subdirectory for backups (e.g., 'dev', 'prod')
  // This keeps backups from different environments separate on shared storage
  const environment = process.env.KANBU_ENVIRONMENT || 'default';
  const basePath = process.env.BACKUP_LOCAL_PATH || '/data/backups';

  return {
    storage: (process.env.BACKUP_STORAGE as 'local' | 'gdrive') || 'local',
    // Append environment subdirectory to path
    localPath: `${basePath}/${environment}`,
    gdrivePath: process.env.BACKUP_GDRIVE_PATH || '/home/robin/GoogleDrive/max-backups',
    postgresContainer: process.env.POSTGRES_CONTAINER || null,
    postgresContainerPattern: process.env.POSTGRES_CONTAINER_PATTERN || 'postgres-',
    sourcePath: process.env.KANBU_SOURCE_PATH || '/app',
    environment,
  };
}
