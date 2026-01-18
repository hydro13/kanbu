# Kanbu Backup Functie

## Overzicht

De backup functie in Kanbu is een "noodoplossing" die snel gebouwd is tijdens de ontwikkelfase. Het biedt basis backup mogelijkheden voor zowel de database als de broncode, met opslag naar Google Drive.

**Status:** MVP / Emergency Solution
**Versie:** 1.2.0
**Laatste update:** 2026-01-06

## Huidige Architectuur

### Componenten

| Component | Locatie | Beschrijving |
|-----------|---------|--------------|
| BackupPage | `apps/web/src/pages/admin/BackupPage.tsx` | Admin UI voor backups |
| admin.ts | `apps/api/src/trpc/procedures/admin.ts` | Backend procedures |
| system.ts | `packages/mcp-server/src/tools/system.ts` | MCP tools voor Claude Code |

### Backup Types

#### 1. Database Backup
- **Methode:** `pg_dump` via Docker exec
- **Commando:** `sudo docker exec kanbu-postgres pg_dump -U kanbu -d kanbu`
- **Output:** SQL dump bestand
- **Locatie:** `/home/robin/GoogleDrive/max-backups/kanbu_backup_*.sql`
- **Retentie:** Onbeperkt (geen automatische cleanup)

#### 2. Source Code Backup
- **Methode:** `tar -czf` van Kanbu directory
- **Exclusions:** node_modules, .git, .turbo, dist, .next, *.log, .env.local, coverage
- **Output:** .tar.gz archief (~30-50 MB)
- **Locatie:** `/home/robin/GoogleDrive/max-backups/kanbu_source_*.tar.gz`
- **Retentie:** Onbeperkt

### Dataflow

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

## Beperkingen

### Kritieke Problemen

| Probleem | Impact | Urgentie |
|----------|--------|----------|
| **Hardcoded paden** | Werkt alleen op MAX machine | Hoog |
| **Docker container naam** | `kanbu-postgres` werkt niet op Coolify | Hoog |
| **Geen restore UI** | Handmatig restoren vereist | Hoog |
| **Geen scheduling** | Alleen handmatige backups | Medium |

### Functionele Beperkingen

1. **Geen backup historie** - UI toont geen lijst van bestaande backups
2. **Geen download knop** - Gebruiker moet naar Google Drive gaan
3. **Geen selectieve restore** - Alles of niets
4. **Geen backup verificatie** - Geen integriteitscontroles
5. **Geen encryptie** - Data staat onversleuteld op Google Drive
6. **Geen notificaties** - Geen email/webhook na backup

### Platform Beperkingen

- **MAX Machine Only** - Hardcoded paden naar `/home/robin/...`
- **rclone vereist** - Google Drive mount moet actief zijn
- **sudo vereist** - Docker exec vereist sudo rechten
- **Container naam hardcoded** - Werkt niet met Coolify's dynamische namen

## Huidige Gebruik

### Via Web UI

1. Ga naar Admin > Backup
2. Klik "Create Database Backup" of "Create Source Backup"
3. Wacht tot backup voltooid is
4. Bekijk resultaat (bestandsnaam, grootte, totaal aantal)

### Via MCP (Claude Code)

```
kanbu_create_db_backup
kanbu_create_source_backup
```

### Handmatig Restoren

```bash
# Database restore
cat /path/to/backup.sql | docker exec -i kanbu-postgres psql -U kanbu -d kanbu

# Source restore
tar -xzf kanbu_source_*.tar.gz
cd kanbu && pnpm install && pnpm build
```

## Technische Details

### Database Backup Flow

```typescript
// 1. Genereer unieke bestandsnaam
const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupFileName = `kanbu_backup_${timestamp}.sql`

// 2. Check Google Drive mount
await fs.access(GDRIVE_BACKUP_DIR)

// 3. Maak pg_dump via Docker
await execAsync(`sudo docker exec kanbu-postgres pg_dump -U kanbu -d kanbu > "${tempFile}"`)

// 4. Kopieer naar Google Drive
await fs.copyFile(tempFile, gdrivePath)

// 5. Cleanup temp file
await fs.unlink(tempFile)
```

### Source Backup Flow

```typescript
// 1. Genereer unieke bestandsnaam
const archiveName = `kanbu_source_${timestamp}.tar.gz`

// 2. Maak tar.gz met exclusions
const excludePatterns = ['node_modules', '.git', '.turbo', 'dist', ...]
await execAsync(`tar ${excludePatterns} -czf "${tempArchive}" kanbu`)

// 3. Kopieer naar Google Drive
await fs.copyFile(tempArchive, gdrivePath)
```

## Dependencies

| Dependency | Versie | Gebruik |
|------------|--------|---------|
| rclone | - | Google Drive mount |
| Docker | 20+ | Database access |
| PostgreSQL | 15 | pg_dump |
| tar | GNU | Source archiving |

## Audit Logging

Beide backup types worden gelogd in de audit trail:

```typescript
await auditService.logSettingsEvent({
  action: AUDIT_ACTIONS.BACKUP_CREATED,
  resourceType: 'backup',
  resourceName: fileName,
  metadata: { type: 'database|source', fileSize, totalBackups },
  userId: ctx.user!.id,
})
```

## Gerelateerde Bestanden

- [admin.ts:1461-1640](../apps/api/src/trpc/procedures/admin.ts#L1461-L1640) - Backend procedures
- [BackupPage.tsx](../apps/web/src/pages/admin/BackupPage.tsx) - Frontend component
- [system.ts:424-494](../packages/mcp-server/src/tools/system.ts#L424-L494) - MCP handlers

## Zie Ook

- [ROADMAP.md](./ROADMAP.md) - Toekomstplannen voor de backup functie
