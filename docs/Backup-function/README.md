# Kanbu Backup Function

## Overview

The Kanbu backup system provides enterprise-grade data protection for both database and source code, with support for multiple storage backends, scheduling, encryption, and verification.

**Status:** Production Ready
**Version:** 2.0.0
**Last Updated:** 2026-01-18

## Current Architecture

### Components

| Component          | Location                                        | Description                    |
| ------------------ | ----------------------------------------------- | ------------------------------ |
| BackupService      | `apps/api/src/services/backup/backupService.ts` | Main orchestration service     |
| BackupPage         | `apps/web/src/pages/admin/BackupPage.tsx`       | Admin UI for backups           |
| dockerDiscovery.ts | `apps/api/src/services/backup/container/`       | Dual-mode PostgreSQL backup    |
| Storage Backends   | `apps/api/src/services/backup/storage/`         | Local and Google Drive storage |
| Scheduler          | `apps/api/src/services/backup/scheduler/`       | Cron-style scheduling          |
| Crypto             | `apps/api/src/services/backup/crypto/`          | AES-256-GCM encryption         |
| Verification       | `apps/api/src/services/backup/verification/`    | SHA-256 checksums              |

### Backup Modes

The system supports two modes for database backups:

| Mode       | Description                                           | Use Case                                    |
| ---------- | ----------------------------------------------------- | ------------------------------------------- |
| **Direct** | `pg_dump` via network connection using `DATABASE_URL` | Containerized deployments (Coolify, Docker) |
| **Docker** | `docker exec pg_dump` in the postgres container       | Development, Docker socket access           |

**Auto-detection:** By default (`BACKUP_PG_MODE=auto`), the system tries direct mode first, then falls back to Docker mode.

### Backup Types

#### 1. Database Backup

- **Direct Mode:** `PGPASSWORD=xxx pg_dump -h host -U user -d database`
- **Docker Mode:** `docker exec container pg_dump -U kanbu -d kanbu`
- **Output:** Compressed SQL dump (`.sql.gz`) with optional encryption (`.sql.gz.enc`)
- **Features:** Checksum verification, optional AES-256-GCM encryption

#### 2. Source Code Backup

- **Method:** `tar -czf` of Kanbu directory
- **Exclusions:** node_modules, .git, .turbo, dist, .next, \*.log, .env.local, coverage
- **Output:** `.tar.gz` archive with optional encryption (`.tar.gz.enc`)

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        Backup Pipeline                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  pg_dump/tar → gzip → SHA-256 checksum → AES-256-GCM → Storage │
│                                                                 │
│  CREATE: source → compress → hash → encrypt → save              │
│  RESTORE: download → decrypt → verify hash → decompress → apply │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Completed Features

| Feature                              | Phase | Status |
| ------------------------------------ | ----- | ------ |
| Dual-mode backup (direct/docker)     | 1     | ✅     |
| Local storage backend                | 1     | ✅     |
| Google Drive storage backend         | 1     | ✅     |
| Environment-based configuration      | 1     | ✅     |
| Backup list & history                | 2     | ✅     |
| Download functionality               | 2     | ✅     |
| Delete with confirmation             | 2     | ✅     |
| Hybrid scheduler (internal/external) | 3     | ✅     |
| Retention policies                   | 3     | ✅     |
| Database restore with safety checks  | 3     | ✅     |
| Webhook notifications                | 3     | ✅     |
| AES-256-GCM encryption               | 4     | ✅     |
| SHA-256 verification                 | 4     | ✅     |

### Planned Features

- Multi-storage replication
- Point-in-Time Recovery (PITR)
- Key rotation

## Configuration

### Environment Variables

```env
# Storage
BACKUP_STORAGE=local                  # local | gdrive
BACKUP_LOCAL_PATH=/data/backups       # For local storage
BACKUP_GDRIVE_PATH=/path/to/gdrive    # For Google Drive

# PostgreSQL Backup Mode
BACKUP_PG_MODE=auto                   # auto | direct | docker
POSTGRES_CONTAINER=kanbu-postgres     # For docker mode
POSTGRES_CONTAINER_PATTERN=postgres-  # For docker mode pattern matching

# Encryption (optional)
BACKUP_ENCRYPTION_KEY=your-secret     # Enables AES-256-GCM

# Scheduler
BACKUP_SCHEDULER_MODE=internal        # internal | external | both
BACKUP_TRIGGER_API_KEY=secret         # For external triggers
BACKUP_CRON_TIMEZONE=UTC              # Timezone for cron
```

### Coolify/Docker Deployment

For containerized deployments, use **direct mode** (default with `BACKUP_PG_MODE=auto`):

```env
BACKUP_STORAGE=local
BACKUP_LOCAL_PATH=/data/backups
BACKUP_PG_MODE=auto                   # Will use direct mode via DATABASE_URL
```

The API container includes `postgresql-client` and will use the existing `DATABASE_URL` for direct pg_dump.

### Development Machine

For development with Docker access:

```env
BACKUP_STORAGE=gdrive
BACKUP_GDRIVE_PATH=/home/user/GoogleDrive/backups
BACKUP_PG_MODE=docker                 # Use docker exec
POSTGRES_CONTAINER=kanbu-postgres
```

## Usage

### Via Web UI

1. Go to **Admin → Backup**
2. Click **Create Database Backup** or **Create Source Backup**
3. View status, download, verify, or restore backups
4. Configure schedules and retention policies

### Via MCP (Claude Code)

```
kanbu_create_db_backup
kanbu_create_source_backup
```

### Via External Trigger

```bash
curl -X POST https://kanbu.example.com/api/backup/trigger \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type": "database"}'
```

## Technical Details

### Direct Mode (Containerized)

Uses `DATABASE_URL` to connect directly to PostgreSQL:

```typescript
const command = `PGPASSWORD='${password}' pg_dump -h ${host} -p ${port} -U ${user} -d ${database}`;
```

**Requirements:**

- `postgresql-client` installed in API container (included in Dockerfile)
- `DATABASE_URL` environment variable set

### Docker Mode (Development)

Uses Docker exec to run pg_dump in the postgres container:

```typescript
const command = `docker exec ${container} pg_dump -U kanbu -d kanbu`;
```

**Requirements:**

- Docker socket access (`/var/run/docker.sock`)
- Running PostgreSQL container

## Dependencies

| Dependency        | Version | Usage                            |
| ----------------- | ------- | -------------------------------- |
| postgresql-client | 16      | Direct pg_dump (in Docker image) |
| Docker            | 20+     | Docker mode backups              |
| gzip              | -       | Compression                      |
| Node.js crypto    | -       | AES-256-GCM encryption           |

## Related Documentation

- [USER-GUIDE.md](./USER-GUIDE.md) - Complete user guide
- [ROADMAP.md](./ROADMAP.md) - Development roadmap
- [DEV-ENVIRONMENT.md](../DEV-ENVIRONMENT.md) - Development setup
