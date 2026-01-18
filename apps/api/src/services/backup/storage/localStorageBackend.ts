/**
 * Local Storage Backend
 *
 * Stores backups on the local filesystem.
 * Default backend for Coolify/Docker deployments.
 */

import * as fs from 'fs/promises'
import * as path from 'path'
import { BackupStorage, BackupFile, BackupType, getBackupConfig } from './types'

export class LocalStorageBackend implements BackupStorage {
  private basePath: string

  constructor(basePath?: string) {
    this.basePath = basePath || getBackupConfig().localPath
  }

  async save(data: Buffer, filename: string): Promise<string> {
    await this.ensureDirectory()
    const filePath = path.join(this.basePath, filename)
    await fs.writeFile(filePath, data)
    return filePath
  }

  async saveFromFile(sourcePath: string, filename: string): Promise<string> {
    await this.ensureDirectory()
    const destPath = path.join(this.basePath, filename)
    await fs.copyFile(sourcePath, destPath)
    return destPath
  }

  async list(type: BackupType): Promise<BackupFile[]> {
    try {
      await this.ensureDirectory()
      const files = await fs.readdir(this.basePath)

      // Updated patterns to support:
      // - Legacy uncompressed: kanbu_backup_*.sql
      // - Compressed: kanbu_backup_*.sql.gz
      // - Encrypted: kanbu_backup_*.sql.gz.enc or kanbu_backup_*.sql.enc
      const pattern = type === 'database'
        ? /^kanbu_backup_.*\.sql(\.gz)?(\.enc)?$/
        : /^kanbu_source_.*\.tar\.gz(\.enc)?$/

      const backupFiles: BackupFile[] = []

      for (const filename of files) {
        if (!pattern.test(filename)) continue

        const filePath = path.join(this.basePath, filename)
        const stats = await fs.stat(filePath)

        backupFiles.push({
          filename,
          size: stats.size,
          createdAt: stats.mtime,
          type,
          isEncrypted: filename.endsWith('.enc'),
        })
      }

      // Sort by date, newest first
      return backupFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } catch (error) {
      // Directory doesn't exist or can't be read
      return []
    }
  }

  async delete(filename: string): Promise<void> {
    const filePath = path.join(this.basePath, filename)
    await fs.unlink(filePath)
  }

  async download(filename: string): Promise<Buffer> {
    const filePath = path.join(this.basePath, filename)
    return fs.readFile(filePath)
  }

  getPath(): string {
    return this.basePath
  }

  async isAccessible(): Promise<boolean> {
    try {
      await this.ensureDirectory()
      // Try to write a test file
      const testFile = path.join(this.basePath, '.backup-test')
      await fs.writeFile(testFile, 'test')
      await fs.unlink(testFile)
      return true
    } catch {
      return false
    }
  }

  private async ensureDirectory(): Promise<void> {
    try {
      await fs.access(this.basePath)
    } catch {
      await fs.mkdir(this.basePath, { recursive: true })
    }
  }
}
