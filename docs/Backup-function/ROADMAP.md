# Backup Function Roadmap

This document describes the planned improvements for the Kanbu backup function, from the current emergency solution to a mature, production-ready system.

## Phase Overview

| Phase | Name | Focus | Status |
|-------|------|-------|--------|
| 0 | Current State | Emergency solution | Complete |
| 1 | Production Ready | Coolify compatibility | **Complete** |
| 2 | Self-Service | List, Download, Delete | **Complete** |
| 3 | Automation | Scheduling, Restore & monitoring | **Complete** |
| 4 | Enterprise | Encryption & multi-storage | **Partial** (4.1 ✅, 4.4 ✅) |

---

## Phase 1: Production Ready ✅

**Goal:** Make backup function work on Coolify/production environments.

**Status:** Complete (2026-01-18)

### 1.1 Dynamic Container Discovery

**Implementation:** `apps/api/src/services/backup/container/dockerDiscovery.ts`

```typescript
// Discovery order:
// 1. POSTGRES_CONTAINER env var (explicit)
// 2. Pattern matching via POSTGRES_CONTAINER_PATTERN
// 3. Default fallback: 'kanbu-postgres'
const container = await findPostgresContainer()
```

**Tasks:**
- [x] Container discovery via environment variable
- [x] Fallback to container name pattern matching
- [x] Error handling when container not found

### 1.2 Flexible Storage Backend

**Implementation:** `apps/api/src/services/backup/storage/`

```typescript
interface BackupStorage {
  save(data: Buffer, filename: string): Promise<string>
  saveFromFile(sourcePath: string, filename: string): Promise<string>
  list(type: BackupType): Promise<BackupFile[]>
  delete(filename: string): Promise<void>
  download(filename: string): Promise<Buffer>
  getPath(): string
  isAccessible(): Promise<boolean>
}
```

**Tasks:**
- [x] Define storage interface (`storage/types.ts`)
- [x] LocalStorageBackend implementation (`storage/localStorageBackend.ts`)
- [x] GDriveStorageBackend implementation (`storage/gdriveStorageBackend.ts`)
- [x] Storage factory with env selection (`storage/index.ts`)

### 1.3 Environment-Aware Configuration

```env
# .env configuration
BACKUP_STORAGE=local|gdrive           # Storage backend
BACKUP_LOCAL_PATH=/data/backups       # For Coolify/Docker
BACKUP_GDRIVE_PATH=/path/to/gdrive    # For dev machines with rclone
POSTGRES_CONTAINER=kanbu-postgres     # Explicit container (optional)
POSTGRES_CONTAINER_PATTERN=postgres-  # Pattern matching (fallback)
KANBU_SOURCE_PATH=/app                # Source backup location
```

**Tasks:**
- [x] Environment variables for all backup settings
- [x] Configuration via `getBackupConfig()` function
- [x] Documentation in `.env.example` files

### 1.4 Phase 1 Deliverables

- [x] Backup works on MAX (development) - tested with Google Drive
- [x] Backup works on Coolify (production) - uses local storage
- [x] Configurable storage backend via `BACKUP_STORAGE`
- [x] No more hardcoded paths - all configurable via env vars

---

## Phase 2: Self-Service ✅

**Goal:** Users can manage and restore backups via the UI.

**Status:** Complete (2026-01-18)

### 2.1 Backup List & History ✅

**Implementation:** `apps/api/src/trpc/procedures/admin.ts`

```typescript
// List backups endpoint
listBackups: adminProcedure.query(async () => {
  return await backupService.listBackups()
})

// Status endpoint
getBackupStatus: adminProcedure.query(async () => {
  return await backupService.getStatus()
})
```

**UI Features:**
- [x] Table with all backups (date, type, size)
- [x] Filter by type (database/source) - separate tables
- [ ] Sort by date/size - Future enhancement
- [ ] Pagination for large lists - Shows max 10

### 2.2 Download Functionality ✅

**Implementation:** `apps/api/src/trpc/procedures/admin.ts`

```typescript
downloadBackup: adminProcedure
  .input(z.object({ filename: z.string() }))
  .mutation(async ({ input }) => {
    const buffer = await backupService.downloadBackup(input.filename)
    return {
      filename: input.filename,
      data: buffer.toString('base64'),
      size: buffer.length,
    }
  })
```

**UI Features:**
- [x] Download button per backup
- [x] Progress indicator (spinner during download)
- [x] Direct browser download via blob URL

### 2.3 Restore Wizard

**Status:** Implemented in Phase 3 ✅

Restore functionality was deferred to Phase 3 due to complexity. See Phase 3.4 for full implementation details.

**Completed Tasks:**
- [x] Restore confirmation dialog with warnings
- [x] Pre-restore backup (automatically backup before restore)
- [x] Multi-step confirmation (2 clicks required)
- [x] Post-restore verification

### 2.4 Delete Old Backups ✅

**Implementation:** `apps/api/src/trpc/procedures/admin.ts`

```typescript
deleteBackup: adminProcedure
  .input(z.object({ filename: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await backupService.deleteBackup(input.filename)
    // Audit logging included
  })
```

**UI Features:**
- [x] Delete button per backup
- [x] Confirmation required (click twice)
- [x] Auto-cancel after 3 seconds
- [ ] Bulk delete selection - Future enhancement
- [x] Retention policy configuration - Implemented in Phase 3
- [x] Protection against deleting last backup - Implemented in Phase 3

### 2.5 Phase 2 Deliverables

- [x] Backup list page with status card
- [x] Download functionality with progress
- [x] Restore wizard with confirmation - Implemented in Phase 3
- [x] Delete with confirmation

---

## Phase 3: Automation ✅

**Goal:** Automated backups with scheduling, restore functionality, and notifications.

**Status:** Complete (2026-01-18)

### 3.1 Hybrid Scheduler ✅

**Implementation:** `apps/api/src/services/backup/scheduler/`

The scheduler supports three modes via `BACKUP_SCHEDULER_MODE` environment variable:
- `internal` - node-cron in API process (default for self-hosted)
- `external` - Only HTTP trigger endpoints (for SaaS with external cron)
- `both` - Both active (maximum flexibility)

**Files:**
- `scheduleService.ts` - Schedule CRUD, execution logic, cron validation
- `internalScheduler.ts` - node-cron based scheduler with hot reload

```typescript
// Prisma model
model BackupSchedule {
  id              Int       @id @default(autoincrement())
  name            String    // "Daily Database Backup"
  type            BackupType
  cronExpression  String    // "0 2 * * *" (daily at 02:00)
  enabled         Boolean   @default(true)
  retentionDays   Int       @default(30)
  keepDaily       Int       @default(7)
  keepWeekly      Int       @default(4)
  keepMonthly     Int       @default(3)
  lastRunAt       DateTime?
  nextRunAt       DateTime?
  // ...
}
```

**Tasks:**
- [x] Schedule configuration UI (create, edit, delete, toggle)
- [x] Internal scheduler with node-cron
- [x] External HTTP trigger endpoint (`/api/backup/trigger`)
- [x] Prevent overlap via scheduler status tracking
- [x] Run schedule manually ("Run Now" button)

### 3.2 Retention Policies ✅

**Implementation:** `apps/api/src/services/backup/scheduler/retentionService.ts`

Smart retention with daily/weekly/monthly bucketing:

```typescript
interface RetentionPolicy {
  retentionDays: number   // Max age in days
  keepDaily: number       // Keep last N daily backups
  keepWeekly: number      // Keep last N weekly backups (Sunday)
  keepMonthly: number     // Keep last N monthly backups (1st)
}
```

**Tasks:**
- [x] Retention policy per schedule
- [x] Automatic cleanup after successful backup
- [x] Preview what would be deleted
- [x] Always keep at least one backup (safety)

### 3.3 Notifications ✅

**Implementation:** `apps/api/src/services/backup/notifications/notificationService.ts`

```typescript
model BackupNotificationConfig {
  id              Int       @id @default(autoincrement())
  notifyOnSuccess Boolean   @default(false)
  notifyOnFailure Boolean   @default(true)
  webhookUrl      String?
  webhookSecret   String?   // For HMAC-SHA256 signature
}
```

**Tasks:**
- [x] In-app notifications for admins
- [x] Webhook support with signed payloads (X-Kanbu-Signature)
- [x] Test webhook button
- [ ] Email notifications - Future enhancement
- [ ] Slack/Discord integration - Future enhancement

### 3.4 Database Restore ✅

**Implementation:** `apps/api/src/services/backup/restore/restoreService.ts`

Safe restore workflow with multiple safety checks:

1. Validate backup file (format, existence, size)
2. Auto-create pre-restore backup
3. Extract and verify SQL dump
4. Terminate existing database connections
5. Execute restore via `psql`
6. Verify table counts post-restore
7. Send notification

**Tasks:**
- [x] Restore validation (file exists, valid format)
- [x] Pre-restore backup (automatic safety backup)
- [x] Multi-step confirmation UI (2 clicks required)
- [x] Restore execution via Docker `psql`
- [x] Post-restore verification

### 3.5 Execution History ✅

**Implementation:** `apps/api/src/services/backup/scheduler/scheduleService.ts`

```typescript
model BackupExecution {
  id            Int             @id @default(autoincrement())
  scheduleId    Int?
  type          BackupType
  trigger       BackupTrigger   // SCHEDULED | MANUAL | EXTERNAL
  status        BackupStatus    // RUNNING | COMPLETED | FAILED
  filename      String?
  fileSize      Int?
  errorMessage  String?
  startedAt     DateTime
  completedAt   DateTime?
  durationMs    Int?
}
```

**Tasks:**
- [x] Log all backup executions
- [x] Execution history UI with status, duration, trigger
- [x] Execution statistics (total, success rate)

### 3.6 Environment Variables

```env
BACKUP_SCHEDULER_MODE=internal        # internal | external | both
BACKUP_TRIGGER_API_KEY=secret-key     # For external trigger auth
BACKUP_CRON_TIMEZONE=Europe/Amsterdam # Timezone for cron expressions
```

### 3.7 Phase 3 Deliverables

- [x] Scheduled backups (cron-style) with hybrid scheduler
- [x] Configurable retention policies
- [x] In-app + webhook notifications
- [x] Database restore with safety checks
- [x] Execution history and statistics
- [x] Complete UI in BackupPage

---

## Phase 4: Enterprise Features

**Goal:** Enterprise-grade backup solution for large deployments.

### 4.1 Encryption at Rest ✅

**Status:** Complete (2026-01-18)

**Implementation:** `apps/api/src/services/backup/crypto/index.ts`

```typescript
// AES-256-GCM encryption for backups
// Key derived via PBKDF2 from BACKUP_ENCRYPTION_KEY env var
// File format: [16 bytes IV][encrypted data][16 bytes auth tag]

await encryptFile(inputPath, outputPath)  // Encrypt backup
await decryptFile(inputPath, outputPath)  // Decrypt for restore
isEncryptionEnabled()                      // Check if key is set
```

**Tasks:**
- [x] Encryption at backup creation (AES-256-GCM)
- [x] Decryption at restore
- [x] Key derivation (PBKDF2 for passphrases, direct hex for 32-byte keys)
- [ ] Key management (rotate, backup keys) - Future enhancement

### 4.2 Multi-Storage Replication

```yaml
# Backup to multiple locations
backup:
  primary: s3://kanbu-backups-eu
  replicas:
    - s3://kanbu-backups-us
    - gdrive://emergency-backups
```

**Tasks:**
- [ ] Parallel upload to multiple storages
- [ ] Verification per storage
- [ ] Fallback if primary fails

### 4.3 Point-in-Time Recovery

```typescript
// WAL archiving for PostgreSQL
interface PITRConfig {
  enabled: boolean
  walArchivePath: string
  retentionDays: number
}
```

**Tasks:**
- [ ] PostgreSQL WAL archiving setup
- [ ] PITR restore interface
- [ ] Timeline management

### 4.4 Backup Verification ✅

**Status:** Complete (2026-01-18)

**Implementation:** `apps/api/src/services/backup/verification/index.ts`

```typescript
// SHA-256 checksum verification
// Checksums generated BEFORE encryption for integrity of original data

await verificationService.verifyBackup(filename)     // Verify single backup
await verificationService.verifyAllPending()         // Batch verification
await verificationService.getVerificationStats()     // Get stats
await verificationService.quickCheck(filename)       // Quick existence check
```

**Tasks:**
- [x] SHA-256 checksum generation (before encryption)
- [x] Checksum validation at restore
- [x] Verification service with single/batch operations
- [x] Verification stats in UI
- [x] Quick integrity check (existence + size)
- [ ] Automated test restore (optional) - Future enhancement

### 4.5 Phase 4 Deliverables

- [x] AES-256-GCM encryption (4.1)
- [ ] Multi-storage replication (4.2)
- [ ] Point-in-Time Recovery (4.3)
- [x] SHA-256 checksum verification (4.4)

---

## Implementation Priorities

### Must Have (Phase 1)
1. Coolify/production compatibility
2. Environment-based configuration
3. Basic error handling

### Should Have (Phase 2)
1. Backup list in UI
2. Download functionality
3. Basic restore

### Nice to Have (Phase 3-4)
1. Scheduled backups
2. Retention policies
3. Encryption
4. PITR

---

## Technical Considerations

### Database Size

| Users | Estimated DB Size | Backup Time |
|-------|-------------------|-------------|
| <100 | <50 MB | <5 sec |
| 100-1000 | 50-500 MB | 5-30 sec |
| 1000-10000 | 500 MB - 5 GB | 30 sec - 5 min |
| >10000 | >5 GB | Consider streaming |

### Storage Costs (Estimated)

| Storage | Price | Notes |
|---------|-------|-------|
| Local | Free | Limited capacity |
| Google Drive | Free (15GB) | Shared with other data |
| S3 | ~$0.023/GB/month | + transfer costs |
| Backblaze B2 | ~$0.005/GB/month | Cheaper alternative |

---

## Related Documentation

- [README.md](./README.md) - Current state of the backup function
- [DEV-ENVIRONMENT.md](../DEV-ENVIRONMENT.md) - Development setup
