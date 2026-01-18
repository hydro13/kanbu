# ACL Migration Guide

## Overview

This document describes how existing permissions are migrated from the legacy system (WorkspaceUser, ProjectMember, GroupPermission) to the new ACL system.

## Migration Script

The migration script is located in:

```
packages/shared/prisma/migrations/acl-migration-helper.ts
```

## Role → Permission Mapping

### Workspace Roles

| Legacy Role | ACL Permissions | Preset       |
| ----------- | --------------- | ------------ |
| VIEWER      | R (1)           | Read Only    |
| MEMBER      | RWX (7)         | Contributor  |
| ADMIN       | RWXD (15)       | Editor       |
| OWNER       | RWXDP (31)      | Full Control |

### Project Roles

| Legacy Role | ACL Permissions | Preset       |
| ----------- | --------------- | ------------ |
| VIEWER      | R (1)           | Read Only    |
| MEMBER      | RWX (7)         | Contributor  |
| MANAGER     | RWXD (15)       | Editor       |
| OWNER       | RWXDP (31)      | Full Control |

## Pre-Migration Checklist

### 1. Backup Database

```bash
# Via Docker
sudo docker exec kanbu-postgres pg_dump -U kanbu kanbu > backup_pre_acl_migration.sql

# Or via psql
PGPASSWORD=kanbu_2025 pg_dump -h localhost -U kanbu kanbu > backup_pre_acl_migration.sql
```

### 2. Audit Current Data

```sql
-- Count WorkspaceUser entries
SELECT COUNT(*) as workspace_users FROM workspace_users;

-- Count ProjectMember entries
SELECT COUNT(*) as project_members FROM project_members;

-- Count GroupPermission entries
SELECT COUNT(*) as group_permissions FROM group_permissions;

-- Count existing ACL entries
SELECT COUNT(*) as acl_entries FROM acl_entries;
```

### 3. Record Current Access

```sql
-- Workspace access per user
SELECT u.username, w.name as workspace, wu.role
FROM workspace_users wu
JOIN users u ON u.id = wu.user_id
JOIN workspaces w ON w.id = wu.workspace_id
ORDER BY u.username, w.name;

-- Project access per user
SELECT u.username, p.name as project, pm.role
FROM project_members pm
JOIN users u ON u.id = pm.user_id
JOIN projects p ON p.id = pm.project_id
ORDER BY u.username, p.name;
```

## Running Migration

### Step 1: Dry Run (Recommended)

First view what would be migrated without actually writing:

```bash
cd /home/robin/genx/v6/dev/kanbu/packages/shared/prisma/migrations

# View the script
cat acl-migration-helper.ts
```

### Step 2: Run Migration

```bash
cd /home/robin/genx/v6/dev/kanbu/packages/shared/prisma/migrations

# Ensure you're in the correct Node environment
export PATH="/home/robin/snap/code/217/.local/share/pnpm/nodejs/22.21.1/bin:$PATH"

# Run the script
npx tsx acl-migration-helper.ts
```

### Expected Output

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

## Post-Migration Verification

### 1. Check ACL Entries

```sql
-- View all new ACL entries
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

### 2. Compare Access

Test with each user:

1. Log in as user
2. Check workspace listing
3. Check project access
4. Compare with pre-migration notes

### 3. Functional Tests

```bash
cd /home/robin/genx/v6/dev/kanbu/apps/api

# Run ACL tests
pnpm vitest run src/services/__tests__/aclService.test.ts
```

## Rollback Procedure

If something goes wrong:

### 1. Remove ACL Entries

```sql
-- Remove all migrated ACL entries (preserve manually created ones)
DELETE FROM acl_entries
WHERE created_at > '2026-01-08 00:00:00'  -- Adjust date
  AND created_by IS NULL;  -- Migration entries have no creator
```

### 2. Restore Database (if necessary)

```bash
# Restore full backup
PGPASSWORD=kanbu_2025 psql -h localhost -U kanbu kanbu < backup_pre_acl_migration.sql
```

## Troubleshooting

### "ACL entry already exists"

This is normal - the script skips duplicates. Entries that already exist will not be overwritten.

### User has no access anymore

1. Check if ACL entry was created:
   ```sql
   SELECT * FROM acl_entries
   WHERE principal_type = 'user'
     AND principal_id = (SELECT id FROM users WHERE username = 'username');
   ```
2. Check if there's a DENY entry blocking access
3. Manually create an ACL entry via the ACL Manager UI

### Performance issues

After large migrations, run:

```sql
VACUUM ANALYZE acl_entries;
```

## After Successful Migration

When everything works:

1. **Update ROADMAP.md** - Mark Phase 2 as complete
2. **Start Phase 3** - Remove legacy code
3. **Monitor** - Watch logs for permission errors

## See Also

- [README.md](./README.md) - ACL system overview
- [ROADMAP.md](./ROADMAP.md) - Implementation roadmap
