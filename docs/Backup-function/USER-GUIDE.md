# Kanbu Backup System - User Guide

This guide explains how to configure and use the Kanbu backup system for protecting your data.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Backup Types](#backup-types)
- [Storage Backends](#storage-backends)
- [Scheduling Backups](#scheduling-backups)
- [Retention Policies](#retention-policies)
- [Encryption](#encryption)
- [Verification](#verification)
- [Notifications](#notifications)
- [Restore Operations](#restore-operations)
- [External Triggers](#external-triggers)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Kanbu backup system provides comprehensive data protection with:

- **Database backups** - Full PostgreSQL dumps with optional compression and encryption
- **Source code backups** - Complete application archives for disaster recovery
- **Scheduled backups** - Cron-style scheduling with a hybrid scheduler
- **Retention policies** - Smart cleanup with daily/weekly/monthly bucketing
- **Encryption at rest** - AES-256-GCM encryption for secure storage
- **Integrity verification** - SHA-256 checksums to detect corruption
- **Notifications** - Webhook support for monitoring integration

### Architecture

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

---

## Quick Start

### 1. Set Environment Variables

Add these to your `.env` file:

```env
# Required
BACKUP_STORAGE=local
BACKUP_LOCAL_PATH=/data/backups

# Optional - Enable encryption
BACKUP_ENCRYPTION_KEY=your-secret-key-here
```

### 2. Create Your First Backup

1. Navigate to **Admin → Backup** in the Kanbu UI
2. Click **Create Database Backup**
3. Verify the backup appears in the list with a checkmark

### 3. Set Up a Schedule

1. In the Backup page, scroll to **Backup Schedules**
2. Click **Add Schedule**
3. Configure:
   - Name: "Daily Database Backup"
   - Type: Database
   - Cron: `0 2 * * *` (daily at 2:00 AM)
   - Retention: 30 days
4. Click **Create**

---

## Configuration

### Environment Variables

| Variable                     | Required  | Default          | Description                                       |
| ---------------------------- | --------- | ---------------- | ------------------------------------------------- |
| `BACKUP_STORAGE`             | Yes       | `local`          | Storage backend: `local` or `gdrive`              |
| `BACKUP_LOCAL_PATH`          | If local  | `/data/backups`  | Path for local storage                            |
| `BACKUP_GDRIVE_PATH`         | If gdrive | -                | Path to mounted Google Drive                      |
| `BACKUP_PG_MODE`             | No        | `auto`           | Backup mode: `auto`, `direct`, or `docker`        |
| `POSTGRES_CONTAINER`         | No        | `kanbu-postgres` | PostgreSQL container name (docker mode)           |
| `POSTGRES_CONTAINER_PATTERN` | No        | `postgres-`      | Pattern for container discovery (docker mode)     |
| `KANBU_SOURCE_PATH`          | No        | `/app`           | Path to Kanbu source code                         |
| `BACKUP_ENCRYPTION_KEY`      | No        | -                | Enables AES-256-GCM encryption                    |
| `BACKUP_SCHEDULER_MODE`      | No        | `internal`       | Scheduler mode: `internal`, `external`, or `both` |
| `BACKUP_TRIGGER_API_KEY`     | No        | -                | API key for external triggers                     |
| `BACKUP_CRON_TIMEZONE`       | No        | `UTC`            | Timezone for cron expressions                     |

### Example Configurations

#### Self-Hosted (Docker/Coolify)

```env
BACKUP_STORAGE=local
BACKUP_LOCAL_PATH=/data/backups
BACKUP_ENCRYPTION_KEY=my-secure-passphrase
BACKUP_SCHEDULER_MODE=internal
BACKUP_CRON_TIMEZONE=Europe/Amsterdam
```

#### Development Machine

```env
BACKUP_STORAGE=gdrive
BACKUP_GDRIVE_PATH=/home/user/GoogleDrive/kanbu-backups
KANBU_SOURCE_PATH=/home/user/projects/kanbu
```

#### SaaS with External Scheduler

```env
BACKUP_STORAGE=local
BACKUP_LOCAL_PATH=/data/backups
BACKUP_SCHEDULER_MODE=external
BACKUP_TRIGGER_API_KEY=your-secret-api-key
```

---

## Backup Types

### Database Backup

Creates a complete PostgreSQL dump of the Kanbu database.

**Backup Modes:**

The system supports two modes for database backups:

| Mode       | How it works                                | Best for                                        |
| ---------- | ------------------------------------------- | ----------------------------------------------- |
| **Direct** | `pg_dump` via network using `DATABASE_URL`  | Containerized deployments (Coolify, Kubernetes) |
| **Docker** | `docker exec pg_dump` in postgres container | Development, Docker socket access               |

Set `BACKUP_PG_MODE` to control the mode:

- `auto` (default): Tries direct first, falls back to docker
- `direct`: Force direct mode (requires `DATABASE_URL`)
- `docker`: Force docker mode (requires Docker socket access)

**Process:**

1. `pg_dump` exports all tables and data (direct or docker mode)
2. gzip compresses the output (~90% reduction)
3. SHA-256 checksum is generated
4. Optional AES-256-GCM encryption
5. Stored with timestamp: `kanbu_backup_2026-01-18T10-30-00.sql.gz[.enc]`

**What's Included:**

- All tables (users, workspaces, projects, tasks, etc.)
- Sequences and indexes
- Foreign key relationships
- Custom types and enums

**What's NOT Included:**

- Uploaded files (attachments)
- External service credentials
- Environment variables

### Source Code Backup

Creates a complete archive of the Kanbu application.

**Process:**

1. `tar` creates an archive
2. gzip compresses the output
3. SHA-256 checksum is generated
4. Optional AES-256-GCM encryption
5. Stored with timestamp: `kanbu_source_2026-01-18T10-30-00.tar.gz[.enc]`

**What's Included:**

- All source code
- Configuration files
- Prisma schema
- Package manifests

**Automatically Excluded:**

- `node_modules/`
- `.git/`
- `dist/`
- `.next/`
- `.turbo/`
- `coverage/`
- `*.log`
- `.env.local`

---

## Storage Backends

### Local Storage

Stores backups on the local filesystem. Recommended for Docker/Coolify deployments.

```env
BACKUP_STORAGE=local
BACKUP_LOCAL_PATH=/data/backups
```

**Directory Structure:**

```
/data/backups/
├── kanbu_backup_2026-01-18T02-00-00.sql.gz.enc
├── kanbu_backup_2026-01-17T02-00-00.sql.gz.enc
├── kanbu_source_2026-01-15T03-00-00.tar.gz.enc
└── ...
```

**Best Practices:**

- Mount a persistent volume to `/data/backups`
- Set up off-site replication (rsync, rclone, etc.)
- Monitor disk space usage

### Google Drive Storage

Stores backups on Google Drive via rclone mount. Ideal for development.

```env
BACKUP_STORAGE=gdrive
BACKUP_GDRIVE_PATH=/home/user/GoogleDrive/kanbu-backups
```

**Prerequisites:**

1. Install rclone: `sudo apt install rclone`
2. Configure Google Drive: `rclone config`
3. Mount: `rclone mount gdrive: /path/to/mount --daemon`

**Note:** Ensure the mount is active before creating backups.

---

## Scheduling Backups

### Creating a Schedule

1. Go to **Admin → Backup → Backup Schedules**
2. Click **Add Schedule**
3. Fill in the form:

| Field           | Description              | Example                 |
| --------------- | ------------------------ | ----------------------- |
| Name            | Descriptive name         | "Daily Database Backup" |
| Type            | Database or Source       | Database                |
| Cron Expression | Standard cron format     | `0 2 * * *`             |
| Enabled         | Toggle on/off            | Yes                     |
| Retention Days  | Max age in days          | 30                      |
| Keep Daily      | Daily backups to keep    | 7                       |
| Keep Weekly     | Weekly backups (Sundays) | 4                       |
| Keep Monthly    | Monthly backups (1st)    | 3                       |

### Common Cron Expressions

| Schedule                    | Cron Expression |
| --------------------------- | --------------- |
| Daily at 2:00 AM            | `0 2 * * *`     |
| Twice daily (2 AM & 2 PM)   | `0 2,14 * * *`  |
| Weekly on Sunday at 3:00 AM | `0 3 * * 0`     |
| Monthly on 1st at 4:00 AM   | `0 4 1 * *`     |
| Every 6 hours               | `0 */6 * * *`   |

### Scheduler Modes

| Mode       | Description              | Use Case                     |
| ---------- | ------------------------ | ---------------------------- |
| `internal` | Node-cron in API process | Self-hosted, single instance |
| `external` | HTTP trigger only        | SaaS, AWS Lambda, serverless |
| `both`     | Both active              | Maximum flexibility          |

---

## Retention Policies

Retention policies automatically clean up old backups while keeping important snapshots.

### How It Works

After each successful backup, the retention service:

1. **Collects all backups** of the same type (database/source)
2. **Removes expired backups** older than `retentionDays`
3. **Keeps daily backups** from the last `keepDaily` days
4. **Keeps weekly backups** (Sundays) from the last `keepWeekly` weeks
5. **Keeps monthly backups** (1st of month) from the last `keepMonthly` months
6. **Never deletes the last backup** (safety feature)

### Example Configuration

```
Retention Days: 30
Keep Daily: 7
Keep Weekly: 4
Keep Monthly: 3
```

This keeps:

- All backups from the last 7 days
- Sunday backups from the last 4 weeks
- 1st-of-month backups from the last 3 months
- Nothing older than 30 days (except protected backups)

### Preview Deletions

Before creating a backup, you can preview what would be deleted:

1. In the schedule row, click the **retention info icon**
2. View the list of backups that will be removed
3. Adjust retention settings if needed

---

## Encryption

### Enabling Encryption

Set the `BACKUP_ENCRYPTION_KEY` environment variable:

```env
# Option 1: 64-character hex string (32 bytes)
BACKUP_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Option 2: Any passphrase (PBKDF2 derived)
BACKUP_ENCRYPTION_KEY=my-super-secure-passphrase-2026
```

### How Encryption Works

**Algorithm:** AES-256-GCM (Galois/Counter Mode)
**Key Derivation:** PBKDF2 with 100,000 iterations (if passphrase)

**File Format:**

```
[16 bytes: IV][N bytes: encrypted data][16 bytes: auth tag]
```

**Pipeline:**

1. Backup is compressed (gzip)
2. SHA-256 checksum generated (before encryption)
3. AES-256-GCM encrypts the file
4. `.enc` extension added to filename

### Important Notes

- **Keep your key safe!** Without it, encrypted backups cannot be restored
- Store the key separately from backups (different location/service)
- Consider using a secrets manager (Vault, AWS KMS, etc.)
- Key rotation is not yet supported - plan ahead

### Encrypted vs Unencrypted Filenames

| Type     | Unencrypted             | Encrypted                   |
| -------- | ----------------------- | --------------------------- |
| Database | `kanbu_backup_*.sql.gz` | `kanbu_backup_*.sql.gz.enc` |
| Source   | `kanbu_source_*.tar.gz` | `kanbu_source_*.tar.gz.enc` |

---

## Verification

### Integrity Verification

Every backup includes a SHA-256 checksum generated **before** encryption. This ensures:

- Files are not corrupted during storage
- Tampering can be detected
- Restore will fail safely if data is invalid

### Verification Status

In the Backup page, you'll see verification status:

| Status      | Icon            | Meaning                                     |
| ----------- | --------------- | ------------------------------------------- |
| Verified    | Green checkmark | Checksum matches, backup is valid           |
| Pending     | Yellow dot      | Not yet verified                            |
| Failed      | Red X           | Checksum mismatch - backup may be corrupted |
| No Checksum | Gray            | Legacy backup without stored checksum       |

### Manual Verification

1. In the backup list, click **Verify** next to any backup
2. The system will:
   - Download the backup
   - Decrypt if encrypted
   - Compare SHA-256 checksum with stored value
3. Result is shown and recorded in the database

### Batch Verification

Click **Verify All Pending** to verify all unverified backups at once.

### Verification Stats Card

The UI shows:

- **Total:** All completed backups
- **Verified:** Passed verification
- **Pending:** Awaiting verification
- **Failed:** Verification failed (investigate!)
- **No Checksum:** Legacy backups

---

## Notifications

### Webhook Configuration

1. Go to **Admin → Backup → Notifications**
2. Configure:
   - **Webhook URL:** Your endpoint (e.g., Slack, Discord, custom)
   - **Webhook Secret:** For HMAC-SHA256 signature verification
   - **Notify on Success:** Toggle
   - **Notify on Failure:** Toggle (recommended)

### Webhook Payload

```json
{
  "event": "backup.completed",
  "backup": {
    "type": "database",
    "filename": "kanbu_backup_2026-01-18T02-00-00.sql.gz.enc",
    "fileSize": 1048576,
    "isEncrypted": true,
    "checksum": "a1b2c3d4...",
    "durationMs": 5432
  },
  "schedule": {
    "id": 1,
    "name": "Daily Database Backup"
  },
  "timestamp": "2026-01-18T02:00:05.432Z"
}
```

### Signature Verification

Webhooks include an `X-Kanbu-Signature` header with HMAC-SHA256 signature:

```javascript
const crypto = require('crypto');
const signature = req.headers['x-kanbu-signature'];
const expected = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature === expected) {
  // Valid webhook
}
```

### Test Webhook

Click **Test Webhook** to send a test payload and verify your endpoint.

---

## Restore Operations

### Before You Restore

1. **Verify the backup** - Ensure checksum is valid
2. **Check encryption key** - Must match the key used for backup
3. **Plan for downtime** - Database will be unavailable during restore
4. **Inform users** - If in production, schedule maintenance

### Restore Process

1. Go to **Admin → Backup → Restore Database**
2. Select a backup from the list
3. Review warnings:
   - "This will overwrite the current database"
   - "A pre-restore backup will be created automatically"
4. Click **Restore** (first confirmation)
5. Click **Confirm Restore** (second confirmation)

### What Happens During Restore

1. **Validation** - Backup file is checked
2. **Pre-restore backup** - Current database is backed up first
3. **Download** - Backup file is retrieved from storage
4. **Decryption** - If encrypted, file is decrypted
5. **Verification** - SHA-256 checksum is verified
6. **Decompression** - gzip is extracted
7. **Terminate connections** - Existing database connections are closed
8. **Drop & recreate** - Database is dropped and recreated
9. **Import** - SQL dump is imported via `psql`
10. **Verification** - Table count is verified
11. **Notification** - Success/failure notification sent

### Restore Errors

| Error                            | Cause                           | Solution                    |
| -------------------------------- | ------------------------------- | --------------------------- |
| "Encryption key not set"         | `BACKUP_ENCRYPTION_KEY` missing | Add the key to `.env`       |
| "Checksum mismatch"              | File corrupted or tampered      | Try a different backup      |
| "PostgreSQL container not found" | Docker not running              | Start Docker/containers     |
| "Backup file not found"          | Storage issue                   | Check storage accessibility |

### Manual Restore

If UI restore fails, you can restore manually:

```bash
# 1. Download and decrypt (if encrypted)
# Use the BACKUP_ENCRYPTION_KEY and decrypt with openssl or the API

# 2. Decompress
gunzip kanbu_backup_2026-01-18.sql.gz

# 3. Restore via psql
cat kanbu_backup_2026-01-18.sql | docker exec -i kanbu-postgres psql -U kanbu -d kanbu
```

---

## External Triggers

### HTTP Trigger Endpoint

For external schedulers (AWS CloudWatch, Kubernetes CronJob, etc.):

```
POST /api/backup/trigger
Authorization: Bearer YOUR_BACKUP_TRIGGER_API_KEY
Content-Type: application/json

{
  "type": "database",
  "scheduleId": 1  // Optional
}
```

### Example: AWS Lambda Trigger

```javascript
const https = require('https');

exports.handler = async (event) => {
  const options = {
    hostname: 'kanbu.example.com',
    port: 443,
    path: '/api/backup/trigger',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.BACKUP_API_KEY}`,
      'Content-Type': 'application/json',
    },
  };

  const postData = JSON.stringify({ type: 'database' });

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      resolve({ statusCode: res.statusCode });
    });
    req.write(postData);
    req.end();
  });
};
```

### Example: Kubernetes CronJob

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: kanbu-backup
spec:
  schedule: '0 2 * * *'
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: trigger
              image: curlimages/curl:latest
              command:
                - curl
                - -X
                - POST
                - -H
                - 'Authorization: Bearer $(BACKUP_API_KEY)'
                - -H
                - 'Content-Type: application/json'
                - -d
                - '{"type":"database"}'
                - https://kanbu.example.com/api/backup/trigger
              env:
                - name: BACKUP_API_KEY
                  valueFrom:
                    secretKeyRef:
                      name: kanbu-secrets
                      key: backup-api-key
          restartPolicy: Never
```

---

## Troubleshooting

### Common Issues

#### "Storage not accessible"

**Cause:** Backup directory doesn't exist or lacks permissions.

**Solution:**

```bash
# Check path exists
ls -la /data/backups

# Create if missing
mkdir -p /data/backups

# Fix permissions
chown -R 1000:1000 /data/backups
```

#### "PostgreSQL container not found" or "No backup method available"

**Cause:** Neither direct nor docker mode is available.

**Solution for containerized deployments (Coolify):**

```bash
# Use direct mode (recommended) - requires DATABASE_URL
# The API container includes postgresql-client automatically
BACKUP_PG_MODE=direct

# Verify DATABASE_URL is set
echo $DATABASE_URL
```

**Solution for development (Docker mode):**

```bash
# Find the actual container name
docker ps | grep postgres

# Set explicit name in .env
POSTGRES_CONTAINER=your-postgres-container-name
BACKUP_PG_MODE=docker

# Or use pattern matching
POSTGRES_CONTAINER_PATTERN=postgres-
```

#### "Backup is encrypted but BACKUP_ENCRYPTION_KEY is not set"

**Cause:** Trying to restore/verify an encrypted backup without the key.

**Solution:**

1. Find the original encryption key
2. Add to `.env`: `BACKUP_ENCRYPTION_KEY=your-key`
3. Restart the API server

#### "Checksum verification failed"

**Cause:** Backup file is corrupted or was modified.

**Solution:**

1. Try a different backup if available
2. Check storage for issues
3. If all backups fail, contact support

#### Scheduled backup not running

**Cause:** Scheduler not started or wrong mode.

**Solution:**

```bash
# Check scheduler status in UI (Admin → Backup → System Status)

# Verify environment variable
echo $BACKUP_SCHEDULER_MODE

# Check API logs for scheduler errors
docker logs kanbu-api | grep -i scheduler
```

### Logs and Debugging

**API Logs:**

```bash
docker logs kanbu-api -f --tail 100
```

**Backup-specific logs:**

```bash
docker logs kanbu-api 2>&1 | grep -E '\[Backup\]|\[Restore\]|\[Scheduler\]'
```

**Execution History:**

- Go to **Admin → Backup → Execution History**
- Review status, duration, and error messages

### Getting Help

1. Check the [Execution History](#execution-history) for error messages
2. Review API logs for detailed errors
3. Verify all environment variables are set correctly
4. Test storage accessibility manually
5. If using encryption, verify the key is correct

---

## Best Practices

### Security

1. **Always enable encryption** for production backups
2. **Store encryption key separately** from backups
3. **Use webhook secrets** for notification endpoints
4. **Rotate API keys** periodically
5. **Verify backups regularly** to detect corruption early

### Reliability

1. **Set up multiple schedules** (daily + weekly for redundancy)
2. **Monitor notifications** for failed backups
3. **Test restores periodically** in a staging environment
4. **Keep off-site copies** (different cloud, different region)

### Retention

1. **Don't keep too many backups** - wastes storage
2. **Don't keep too few** - risk of data loss
3. **Use the weekly/monthly buckets** for long-term archival
4. **Review retention policies** quarterly

### Monitoring

1. **Enable failure notifications** at minimum
2. **Set up alerting** on webhook endpoints
3. **Monitor storage usage** to avoid running out of space
4. **Review execution history** weekly

---

## Related Documentation

- [ROADMAP.md](./ROADMAP.md) - Development roadmap and technical details
- [README.md](./README.md) - Original backup documentation (historical)
- [DEV-ENVIRONMENT.md](../DEV-ENVIRONMENT.md) - Development setup
