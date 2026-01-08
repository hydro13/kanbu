# ACL Migratie Handleiding

## Overzicht

Dit document beschrijft hoe bestaande permissies worden gemigreerd van het legacy systeem (WorkspaceUser, ProjectMember, GroupPermission) naar het nieuwe ACL systeem.

## Migratie Script

Het migratie script bevindt zich in:
```
packages/shared/prisma/migrations/acl-migration-helper.ts
```

## Role → Permission Mapping

### Workspace Roles

| Legacy Role | ACL Permissions | Preset        |
|-------------|-----------------|---------------|
| VIEWER      | R (1)           | Read Only     |
| MEMBER      | RWX (7)         | Contributor   |
| ADMIN       | RWXD (15)       | Editor        |
| OWNER       | RWXDP (31)      | Full Control  |

### Project Roles

| Legacy Role | ACL Permissions | Preset        |
|-------------|-----------------|---------------|
| VIEWER      | R (1)           | Read Only     |
| MEMBER      | RWX (7)         | Contributor   |
| MANAGER     | RWXD (15)       | Editor        |
| OWNER       | RWXDP (31)      | Full Control  |

## Pre-Migratie Checklist

### 1. Backup Database
```bash
# Via Docker
sudo docker exec kanbu-postgres pg_dump -U kanbu kanbu > backup_pre_acl_migration.sql

# Of via psql
PGPASSWORD=kanbu_2025 pg_dump -h localhost -U kanbu kanbu > backup_pre_acl_migration.sql
```

### 2. Audit Huidige Data
```sql
-- Tel WorkspaceUser entries
SELECT COUNT(*) as workspace_users FROM workspace_users;

-- Tel ProjectMember entries
SELECT COUNT(*) as project_members FROM project_members;

-- Tel GroupPermission entries
SELECT COUNT(*) as group_permissions FROM group_permissions;

-- Tel bestaande ACL entries
SELECT COUNT(*) as acl_entries FROM acl_entries;
```

### 3. Noteer Huidige Toegang
```sql
-- Workspace toegang per user
SELECT u.username, w.name as workspace, wu.role
FROM workspace_users wu
JOIN users u ON u.id = wu.user_id
JOIN workspaces w ON w.id = wu.workspace_id
ORDER BY u.username, w.name;

-- Project toegang per user
SELECT u.username, p.name as project, pm.role
FROM project_members pm
JOIN users u ON u.id = pm.user_id
JOIN projects p ON p.id = pm.project_id
ORDER BY u.username, p.name;
```

## Migratie Uitvoeren

### Stap 1: Dry Run (Aanbevolen)

Bekijk eerst wat er gemigreerd zou worden zonder daadwerkelijk te schrijven:

```bash
cd /home/robin/genx/v6/dev/kanbu/packages/shared/prisma/migrations

# Bekijk het script
cat acl-migration-helper.ts
```

### Stap 2: Run Migratie

```bash
cd /home/robin/genx/v6/dev/kanbu/packages/shared/prisma/migrations

# Zorg dat je in de juiste Node omgeving zit
export PATH="/home/robin/snap/code/217/.local/share/pnpm/nodejs/22.21.1/bin:$PATH"

# Run het script
npx tsx acl-migration-helper.ts
```

### Verwachte Output

```
============================================================
ACL Migration: Converting existing permissions to ACL entries
============================================================

Migrating WorkspaceUsers to ACL entries...
  ✓ robin -> Kanbu-Playground (OWNER = 31)
  ✓ kees -> Kanbu-Playground (MEMBER = 7)
  - robin -> Other-Workspace (already exists)

Migrating ProjectMembers to ACL entries...
  ✓ robin -> LEARN (OWNER = 31)

Migrating Group permissions to ACL entries...
  ✓ Group:Domain Admins -> admin:root (Full Control)

Creating Super Admin ACL entries...
  ✓ robin -> admin:root (Full Control)

============================================================
Migration Summary:
  - Workspace ACLs created: 2
  - Project ACLs created: 1
  - Group ACLs created: 1
============================================================

Migration complete!

NOTE: The old tables (workspace_users, project_members, group_permissions)
are still intact. You can remove them after verifying the ACL system works.
```

## Post-Migratie Verificatie

### 1. Check ACL Entries
```sql
-- Bekijk alle nieuwe ACL entries
SELECT
  ae.id,
  ae.resource_type,
  ae.resource_id,
  ae.principal_type,
  ae.principal_id,
  ae.permissions,
  ae.deny,
  CASE ae.principal_type
    WHEN 'user' THEN u.username
    WHEN 'group' THEN g.name
  END as principal_name
FROM acl_entries ae
LEFT JOIN users u ON ae.principal_type = 'user' AND ae.principal_id = u.id
LEFT JOIN groups g ON ae.principal_type = 'group' AND ae.principal_id = g.id
ORDER BY ae.resource_type, ae.resource_id;
```

### 2. Vergelijk Toegang

Test met elke user:
1. Log in als user
2. Check workspace listing
3. Check project toegang
4. Vergelijk met pre-migratie notities

### 3. Functionele Tests

```bash
cd /home/robin/genx/v6/dev/kanbu/apps/api

# Run ACL tests
pnpm vitest run src/services/__tests__/aclService.test.ts
```

## Rollback Procedure

Als er iets misgaat:

### 1. Verwijder ACL Entries
```sql
-- Verwijder alle gemigreerde ACL entries (behoud handmatig aangemaakte)
DELETE FROM acl_entries
WHERE created_at > '2026-01-08 00:00:00'  -- Pas datum aan
  AND created_by IS NULL;  -- Migratie entries hebben geen creator
```

### 2. Herstel Database (indien nodig)
```bash
# Restore volledige backup
PGPASSWORD=kanbu_2025 psql -h localhost -U kanbu kanbu < backup_pre_acl_migration.sql
```

## Troubleshooting

### "ACL entry already exists"
Dit is normaal - het script slaat duplicaten over. Entries die al bestaan worden niet overschreven.

### User heeft geen toegang meer
1. Check of ACL entry is aangemaakt:
   ```sql
   SELECT * FROM acl_entries
   WHERE principal_type = 'user'
     AND principal_id = (SELECT id FROM users WHERE username = 'username');
   ```
2. Check of er een DENY entry is die access blokkeert
3. Maak handmatig een ACL entry aan via de ACL Manager UI

### Performance issues
Na grote migraties, run:
```sql
VACUUM ANALYZE acl_entries;
```

## Na Succesvolle Migratie

Wanneer alles werkt:

1. **Update ROADMAP.md** - Markeer Fase 2 als voltooid
2. **Begin met Fase 3** - Legacy code verwijderen
3. **Monitor** - Houd logs in de gaten voor permission errors

## Zie Ook

- [README.md](./README.md) - ACL systeem overzicht
- [ROADMAP.md](./ROADMAP.md) - Implementatie roadmap
