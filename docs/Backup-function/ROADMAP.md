# Backup Functie Roadmap

Dit document beschrijft de geplande verbeteringen voor de Kanbu backup functie, van de huidige noodoplossing naar een volwassen, production-ready systeem.

## Fase Overzicht

| Fase | Naam | Focus | Status |
|------|------|-------|--------|
| 0 | Current State | Noodoplossing | Voltooid |
| 1 | Production Ready | Coolify compatibiliteit | Gepland |
| 2 | Self-Service | Restore via UI | Gepland |
| 3 | Automation | Scheduling & monitoring | Gepland |
| 4 | Enterprise | Encryption & multi-storage | Toekomst |

---

## Fase 1: Production Ready

**Doel:** Backup functie laten werken op Coolify/productie omgevingen.

### 1.1 Dynamic Container Discovery

```typescript
// Huidige situatie (hardcoded):
await execAsync(`sudo docker exec kanbu-postgres pg_dump ...`)

// Nieuwe situatie (dynamic):
const postgresContainer = await findContainerByLabel('kanbu-postgres')
// Of via environment variable
const container = process.env.POSTGRES_CONTAINER || 'kanbu-postgres'
```

**Taken:**
- [ ] Container discovery via Docker labels of environment variable
- [ ] Fallback naar container name pattern matching
- [ ] Error handling als container niet gevonden

### 1.2 Flexible Storage Backend

```typescript
interface BackupStorage {
  save(data: Buffer, filename: string): Promise<string>
  list(): Promise<BackupFile[]>
  delete(filename: string): Promise<void>
  download(filename: string): Promise<Buffer>
}

class LocalStorage implements BackupStorage { ... }
class GoogleDriveStorage implements BackupStorage { ... }
class S3Storage implements BackupStorage { ... }
```

**Taken:**
- [ ] Storage interface definieren
- [ ] LocalStorage implementatie (default voor Coolify)
- [ ] GoogleDriveStorage behouden als optie
- [ ] Storage selectie via environment variable

### 1.3 Environment-Aware Configuration

```env
# .env configuratie
BACKUP_STORAGE=local|gdrive|s3
BACKUP_LOCAL_PATH=/data/backups
BACKUP_GDRIVE_PATH=/max-backups
BACKUP_S3_BUCKET=kanbu-backups
BACKUP_RETENTION_DAYS=30
POSTGRES_CONTAINER=postgres
```

**Taken:**
- [ ] Environment variables voor alle backup settings
- [ ] Validatie bij startup
- [ ] Documentatie voor elke deployment optie

### 1.4 Deliverables Fase 1

- [ ] Backup werkt op MAX (development)
- [ ] Backup werkt op app.kanbu.be (Coolify)
- [ ] Configureerbare storage backend
- [ ] Geen hardcoded paden meer

---

## Fase 2: Self-Service

**Doel:** Gebruikers kunnen backups beheren en restoren via de UI.

### 2.1 Backup Lijst & Historie

```typescript
// Nieuwe API endpoint
listBackups: adminProcedure.query(async () => {
  return {
    database: await storage.list('database'),
    source: await storage.list('source'),
  }
})
```

**UI Features:**
- [ ] Tabel met alle backups (datum, type, grootte)
- [ ] Sorteer op datum/grootte
- [ ] Filter op type (database/source)
- [ ] Paginatie voor grote lijsten

### 2.2 Download Functionaliteit

```typescript
// Download endpoint
downloadBackup: adminProcedure
  .input(z.object({ filename: z.string() }))
  .mutation(async ({ input }) => {
    const buffer = await storage.download(input.filename)
    // Return as base64 of stream naar client
  })
```

**UI Features:**
- [ ] Download knop per backup
- [ ] Progress indicator voor grote bestanden
- [ ] Directe browser download

### 2.3 Restore Wizard

```
┌─────────────────────────────────────────────────────────┐
│  Restore Database                                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ⚠️  WARNING: This will replace ALL current data!       │
│                                                          │
│  Selected backup: kanbu_backup_2026-01-18.sql           │
│  Created: 18 Jan 2026, 14:30                            │
│  Size: 2.4 MB                                            │
│                                                          │
│  [ ] I understand this action cannot be undone          │
│  [ ] I have notified other users                        │
│                                                          │
│           [Cancel]  [Restore Database]                   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

**Taken:**
- [ ] Restore confirmation dialog met waarschuwingen
- [ ] Pre-restore backup (automatisch backup maken voor restore)
- [ ] Restore progress tracking
- [ ] Post-restore verificatie

### 2.4 Delete Old Backups

**UI Features:**
- [ ] Delete knop per backup
- [ ] Bulk delete selectie
- [ ] Retention policy configuratie
- [ ] Bescherming tegen laatste backup verwijderen

### 2.5 Deliverables Fase 2

- [ ] Backup lijst pagina
- [ ] Download functionaliteit
- [ ] Restore wizard met confirmatie
- [ ] Delete met beveiliging

---

## Fase 3: Automation

**Doel:** Geautomatiseerde backups met monitoring en notificaties.

### 3.1 Scheduled Backups

```typescript
// Cron-style scheduling
interface BackupSchedule {
  type: 'database' | 'source'
  cron: string  // "0 2 * * *" = dagelijks 02:00
  enabled: boolean
  retention: number  // dagen
}
```

**Implementatie opties:**
1. **Node-cron in API** - Simpel, maar vereist altijd-running server
2. **Database-based scheduler** - Check elke X minuten
3. **External cron** - Via systemd timer of Coolify cron

**Taken:**
- [ ] Schedule configuratie UI
- [ ] Scheduler implementatie
- [ ] Voorkomen van overlap (locking)

### 3.2 Retention Policies

```typescript
interface RetentionPolicy {
  keepDaily: number    // Laatste N dagelijkse backups
  keepWeekly: number   // Laatste N wekelijkse backups
  keepMonthly: number  // Laatste N maandelijkse backups
  maxAgeDays: number   // Verwijder alles ouder dan X dagen
}
```

**Taken:**
- [ ] Retention policy configuratie
- [ ] Automatische cleanup job
- [ ] "Never delete" optie voor kritieke backups

### 3.3 Notifications

```typescript
interface BackupNotification {
  onSuccess: boolean
  onFailure: boolean
  channels: ('email' | 'webhook' | 'slack')[]
}
```

**Taken:**
- [ ] Email notificaties (via bestaande email service)
- [ ] Webhook support voor custom integraties
- [ ] Slack/Discord integratie (optioneel)

### 3.4 Health Monitoring

**Dashboard Metrics:**
- Laatste succesvolle backup
- Backup grootte trend
- Storage gebruik
- Failures in laatste 7 dagen

**Alerts:**
- Geen backup in X dagen
- Backup grootte significant veranderd
- Storage bijna vol

### 3.5 Deliverables Fase 3

- [ ] Scheduled backups (cron-style)
- [ ] Configureerbare retention
- [ ] Email notificaties
- [ ] Health dashboard

---

## Fase 4: Enterprise Features

**Doel:** Enterprise-grade backup oplossing voor grote deployments.

### 4.1 Encryption at Rest

```typescript
// AES-256 encryption voor backups
interface EncryptionConfig {
  enabled: boolean
  algorithm: 'aes-256-gcm'
  keySource: 'env' | 'vault' | 'kms'
}
```

**Taken:**
- [ ] Encryption bij backup creatie
- [ ] Decryption bij restore
- [ ] Key management (rotate, backup keys)

### 4.2 Multi-Storage Replication

```yaml
# Backup naar meerdere locaties
backup:
  primary: s3://kanbu-backups-eu
  replicas:
    - s3://kanbu-backups-us
    - gdrive://emergency-backups
```

**Taken:**
- [ ] Parallel upload naar meerdere storages
- [ ] Verificatie per storage
- [ ] Fallback als primary faalt

### 4.3 Point-in-Time Recovery

```typescript
// WAL archiving voor PostgreSQL
interface PITRConfig {
  enabled: boolean
  walArchivePath: string
  retentionDays: number
}
```

**Taken:**
- [ ] PostgreSQL WAL archiving setup
- [ ] PITR restore interface
- [ ] Timeline management

### 4.4 Backup Verification

```typescript
// Automatische verificatie
interface BackupVerification {
  checksumValidation: boolean
  testRestore: boolean  // Restore naar temp database
  dataIntegrityChecks: boolean
}
```

**Taken:**
- [ ] Checksum generatie en validatie
- [ ] Automated test restore (optioneel)
- [ ] Reporting van verificatie resultaten

### 4.5 Deliverables Fase 4

- [ ] AES-256 encryption
- [ ] Multi-storage replication
- [ ] Point-in-Time Recovery
- [ ] Automated verification

---

## Implementatie Prioriteiten

### Must Have (Fase 1)
1. Coolify/productie compatibiliteit
2. Environment-based configuratie
3. Basis error handling

### Should Have (Fase 2)
1. Backup lijst in UI
2. Download functionaliteit
3. Basic restore

### Nice to Have (Fase 3-4)
1. Scheduled backups
2. Retention policies
3. Encryption
4. PITR

---

## Technische Overwegingen

### Database Grootte

| Users | Estimated DB Size | Backup Time |
|-------|-------------------|-------------|
| <100 | <50 MB | <5 sec |
| 100-1000 | 50-500 MB | 5-30 sec |
| 1000-10000 | 500 MB - 5 GB | 30 sec - 5 min |
| >10000 | >5 GB | Consider streaming |

### Storage Kosten (Geschat)

| Storage | Prijs | Notes |
|---------|-------|-------|
| Local | Free | Beperkte capaciteit |
| Google Drive | Free (15GB) | Gedeeld met andere data |
| S3 | ~$0.023/GB/month | + transfer kosten |
| Backblaze B2 | ~$0.005/GB/month | Goedkoper alternatief |

---

## Gerelateerde Documentatie

- [README.md](./README.md) - Huidige staat van de backup functie
- [DEV-ENVIRONMENT.md](../DEV-ENVIRONMENT.md) - Development setup
