/**
 * Google Drive Storage Backend
 *
 * Stores backups on Google Drive via rclone mount.
 * Used on development machines where Google Drive is mounted.
 *
 * Prerequisites:
 * - rclone configured with Google Drive
 * - Mount point active (e.g., /home/robin/GoogleDrive)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BackupStorage, BackupFile, BackupType, getBackupConfig } from './types';

export class GDriveStorageBackend implements BackupStorage {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath || getBackupConfig().gdrivePath;
  }

  async save(data: Buffer, filename: string): Promise<string> {
    await this.ensureMounted();
    const filePath = path.join(this.basePath, filename);
    await fs.writeFile(filePath, data);
    return filePath;
  }

  async saveFromFile(sourcePath: string, filename: string): Promise<string> {
    await this.ensureMounted();
    const destPath = path.join(this.basePath, filename);
    await fs.copyFile(sourcePath, destPath);
    return destPath;
  }

  async list(type: BackupType): Promise<BackupFile[]> {
    try {
      await this.ensureMounted();
      const files = await fs.readdir(this.basePath);

      // Updated patterns to support:
      // - Legacy uncompressed: kanbu_backup_*.sql
      // - Compressed: kanbu_backup_*.sql.gz
      // - Encrypted: kanbu_backup_*.sql.gz.enc or kanbu_backup_*.sql.enc
      const pattern =
        type === 'database'
          ? /^kanbu_backup_.*\.sql(\.gz)?(\.enc)?$/
          : /^kanbu_source_.*\.tar\.gz(\.enc)?$/;

      const backupFiles: BackupFile[] = [];

      for (const filename of files) {
        if (!pattern.test(filename)) continue;

        const filePath = path.join(this.basePath, filename);
        const stats = await fs.stat(filePath);

        backupFiles.push({
          filename,
          size: stats.size,
          createdAt: stats.mtime,
          type,
          isEncrypted: filename.endsWith('.enc'),
        });
      }

      // Sort by date, newest first
      return backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch {
      // Directory doesn't exist or can't be read
      return [];
    }
  }

  async delete(filename: string): Promise<void> {
    await this.ensureMounted();
    const filePath = path.join(this.basePath, filename);
    await fs.unlink(filePath);
  }

  async download(filename: string): Promise<Buffer> {
    await this.ensureMounted();
    const filePath = path.join(this.basePath, filename);
    return fs.readFile(filePath);
  }

  getPath(): string {
    return this.basePath;
  }

  async isAccessible(): Promise<boolean> {
    try {
      await fs.access(this.basePath);
      // Check if it's actually mounted (not just empty dir)
      const stats = await fs.stat(this.basePath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Ensure Google Drive is mounted
   * Unlike LocalStorage, we don't create the directory - it must be mounted
   */
  private async ensureMounted(): Promise<void> {
    try {
      await fs.access(this.basePath);
    } catch {
      throw new Error(
        `Google Drive is not mounted at ${this.basePath}. ` +
          'Please check rclone-gdrive service or configure BACKUP_GDRIVE_PATH.'
      );
    }
  }
}
