# Kanbu Backup Function

## Overview

The backup function in Kanbu is an "emergency solution" that was quickly built during the development phase. It provides basic backup capabilities for both the database and source code, with storage to Google Drive.

**Status:** MVP / Emergency Solution
**Version:** 1.2.0
**Last Updated:** 2026-01-18

## Current Architecture

### Components

| Component | Location | Description |
|-----------|----------|-------------|
| BackupPage | `apps/web/src/pages/admin/BackupPage.tsx` | Admin UI for backups |
| admin.ts | `apps/api/src/trpc/procedures/admin.ts` | Backend procedures |
| system.ts | `packages/mcp-server/src/tools/system.ts` | MCP tools for Claude Code |

### Backup Types

#### 1. Database Backup
- **Method:** `pg_dump` via Docker exec
- **Command:** `sudo docker exec kanbu-postgres pg_dump -U kanbu -d kanbu`
- **Output:** SQL dump file
- **Location:** `/home/robin/GoogleDrive/max-backups/kanbu_backup_*.sql`
- **Retention:** Unlimited (no automatic cleanup)

#### 2. Source Code Backup
- **Method:** `tar -czf` of Kanbu directory
- **Exclusions:** node_modules, .git, .turbo, dist, .next, *.log, .env.local, coverage
- **Output:** .tar.gz archive (~30-50 MB)
- **Location:** `/home/robin/GoogleDrive/max-backups/kanbu_source_*.tar.gz`
- **Retention:** Unlimited

### Data Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   BackupPage    │─────>│   tRPC API      │─────>│  Shell Commands │
│   (React)       │      │   (admin.ts)    │      │  (pg_dump/tar)  │
└─────────────────┘      └─────────────────┘      └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  /tmp (temp)    │
                                                  └────────┬────────┘
                                                           │
                                                           ▼
                                                  ┌─────────────────┐
                                                  │  Google Drive   │
                                                  │  (rclone mount) │
                                                  └─────────────────┘
```

## Limitations

### Critical Issues

| Issue | Impact | Urgency |
|-------|--------|---------|
| **Hardcoded paths** | Only works on MAX machine | High |
| **Docker container name** | `kanbu-postgres` doesn't work on Coolify | High |
| **No restore UI** | Manual restore required | High |
| **No scheduling** | Only manual backups | Medium |

### Functional Limitations

1. **No backup history** - UI doesn't show list of existing backups
2. **No download button** - User must go to Google Drive
3. **No selective restore** - All or nothing
4. **No backup verification** - No integrity checks
5. **No encryption** - Data stored unencrypted on Google Drive
6. **No notifications** - No email/webhook after backup

### Platform Limitations

- **MAX Machine Only** - Hardcoded paths to `/home/robin/...`
- **rclone required** - Google Drive mount must be active
- **sudo required** - Docker exec requires sudo privileges
- **Container name hardcoded** - Doesn't work with Coolify's dynamic names

## Current Usage

### Via Web UI

1. Go to Admin > Backup
2. Click "Create Database Backup" or "Create Source Backup"
3. Wait for backup to complete
4. View result (filename, size, total count)

### Via MCP (Claude Code)

```
kanbu_create_db_backup
kanbu_create_source_backup
```

### Manual Restore

```bash
# Database restore
cat /path/to/backup.sql | docker exec -i kanbu-postgres psql -U kanbu -d kanbu

# Source restore
tar -xzf kanbu_source_*.tar.gz
cd kanbu && pnpm install && pnpm build
```

## Technical Details

### Database Backup Flow

```typescript
// 1. Generate unique filename
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFileName = `kanbu_backup_${timestamp}.sql`

// 2. Check Google Drive mount
await fs.access(GDRIVE_BACKUP_DIR)

// 3. Create pg_dump via Docker
await execAsync(`sudo docker exec kanbu-postgres pg_dump -U kanbu -d kanbu > "${tempFile}"`)

// 4. Copy to Google Drive
await fs.copyFile(tempFile, gdrivePath)

// 5. Cleanup temp file
await fs.unlink(tempFile)
```

### Source Backup Flow

```typescript
// 1. Generate unique filename
const archiveName = `kanbu_source_${timestamp}.tar.gz`

// 2. Create tar.gz with exclusions
const excludePatterns = ['node_modules', '.git', '.turbo', 'dist', ...]
await execAsync(`tar ${excludePatterns} -czf "${tempArchive}" kanbu`)

// 3. Copy to Google Drive
await fs.copyFile(tempArchive, gdrivePath)
```

## Dependencies

| Dependency | Version | Usage |
|------------|---------|-------|
| rclone | - | Google Drive mount |
| Docker | 20+ | Database access |
| PostgreSQL | 15 | pg_dump |
| tar | GNU | Source archiving |

## Audit Logging

Both backup types are logged in the audit trail:

```typescript
await auditService.logSettingsEvent({
  action: AUDIT_ACTIONS.BACKUP_CREATED,
  resourceType: 'backup',
  resourceName: fileName,
  metadata: { type: 'database|source', fileSize, totalBackups },
  userId: ctx.user!.id,
})
```

## Related Files

- [admin.ts:1461-1640](../../apps/api/src/trpc/procedures/admin.ts#L1461-L1640) - Backend procedures
- [BackupPage.tsx](../../apps/web/src/pages/admin/BackupPage.tsx) - Frontend component
- [system.ts:424-494](../../packages/mcp-server/src/tools/system.ts#L424-L494) - MCP handlers

## See Also

- [ROADMAP.md](./ROADMAP.md) - Future plans for the backup function
