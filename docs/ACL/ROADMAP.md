# ACL Implementatie Roadmap

## Fase 1: Foundation (Voltooid)

### 1.1 Database & Core Service
- [x] AclEntry model in Prisma schema
- [x] AclService met bitmask permissies
- [x] Deny-first logic implementatie
- [x] Inheritance support (workspace → project)
- [x] Unit tests (15 tests passing)

### 1.2 API Layer
- [x] tRPC procedures voor CRUD operaties
- [x] Authorization checks (requireAclManagement)
- [x] Principal lookup (users + groups)
- [x] Resource listing

### 1.3 UI
- [x] ACL Manager pagina (`/admin/acl`)
- [x] Grant/Deny dialogs
- [x] Permission presets
- [x] Admin sidebar link

### 1.4 Integration
- [x] PermissionService ACL checks
- [x] `getUserWorkspaces()` met ACL support
- [x] `getWorkspaceRole()` met ACL support

---

## Fase 2: Migratie (TODO)

### 2.1 Voorbereidende Stappen
- [ ] Backup maken van database
- [ ] Audit van huidige WorkspaceUser entries
- [ ] Audit van huidige ProjectMember entries
- [ ] Audit van huidige GroupPermission entries

### 2.2 Migratie Uitvoeren
- [ ] Test migratie script in dev omgeving
- [ ] Verifieer dat alle users nog steeds toegang hebben
- [ ] Run migratie script:
  ```bash
  cd packages/shared/prisma/migrations
  npx tsx acl-migration-helper.ts
  ```
- [ ] Valideer ACL entries in database

### 2.3 Verificatie
- [ ] Test workspace listing voor alle users
- [ ] Test workspace access voor alle users
- [ ] Test project access voor alle users
- [ ] Vergelijk ACL entries met legacy data

---

## Fase 3: Legacy Code Verwijderen (TODO)

### 3.1 PermissionService Cleanup
- [ ] Verwijder legacy fallback uit `canAccessWorkspace()`
- [ ] Verwijder legacy fallback uit `canAccessProject()`
- [ ] Verwijder legacy fallback uit `getUserWorkspaces()`
- [ ] Verwijder legacy fallback uit `getWorkspaceRole()`
- [ ] Verwijder `isAclEnabled()` checks (alles is nu ACL)

### 3.2 Workspace Procedures
- [ ] Update `workspace.create` - maak ACL entry ipv WorkspaceUser
- [ ] Update `workspace.invite` - gebruik ACL
- [ ] Update `workspace.addMember` - gebruik ACL
- [ ] Update `workspace.removeMember` - gebruik ACL
- [ ] Update `workspace.updateMemberRole` - gebruik ACL
- [ ] Update `workspace.getMembers` - lees uit ACL

### 3.3 Project Procedures
- [ ] Update `project.create` - maak ACL entry indien nodig
- [ ] Update project member management - gebruik ACL
- [ ] Update `project.getMembers` - lees uit ACL

### 3.4 GroupPermission Cleanup
- [ ] Verwijder GroupPermission tabel usage
- [ ] Migreer naar ACL group entries
- [ ] Update groupPermissionService of deprecate

---

## Fase 4: Uitbreidingen (Future)

### 4.1 Task-Level ACL
- [ ] ACL support voor individuele tasks
- [ ] Private tasks (alleen assignee + creator)
- [ ] Task visibility inheritance van project

### 4.2 Audit Logging
- [ ] Log alle ACL wijzigingen
- [ ] Wie heeft wanneer welke permissie gewijzigd
- [ ] Permission change history per resource

### 4.3 Bulk Operations
- [ ] Bulk grant/revoke voor meerdere users
- [ ] Template-based permission sets
- [ ] Copy permissions van andere resource

### 4.4 Advanced UI
- [ ] Permission matrix view (users x resources)
- [ ] Effective permissions calculator
- [ ] "What-if" simulatie voor nieuwe permissies
- [ ] Import/export van ACL configuratie

### 4.5 LDAP/AD Sync
- [ ] Sync AD groups naar Kanbu groups
- [ ] Automatische ACL updates bij groepswijzigingen
- [ ] OU-based permission inheritance

### 4.6 API Keys & Service Accounts
- [ ] ACL voor API keys
- [ ] Service account permissies
- [ ] Scoped tokens

---

## Fase 5: Database Cleanup (Future)

### 5.1 Deprecate Legacy Tabellen
- [ ] Mark WorkspaceUser as deprecated
- [ ] Mark ProjectMember as deprecated
- [ ] Mark GroupPermission as deprecated

### 5.2 Remove Legacy Tabellen
- [ ] Verwijder WorkspaceUser tabel
- [ ] Verwijder ProjectMember tabel
- [ ] Verwijder GroupPermission tabel
- [ ] Update Prisma schema

---

## Prioriteiten

### High Priority (Nu)
1. **Fase 2.2** - Migratie uitvoeren
2. **Fase 2.3** - Verificatie

### Medium Priority (Korte termijn)
3. **Fase 3.1** - PermissionService cleanup
4. **Fase 3.2** - Workspace procedures

### Low Priority (Later)
5. **Fase 3.3-3.4** - Project/Group cleanup
6. **Fase 4** - Uitbreidingen
7. **Fase 5** - Database cleanup

---

## Risico's & Mitigaties

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Data verlies bij migratie | Hoog | Backup maken, dry-run eerst |
| Gebruikers verliezen toegang | Hoog | Test met alle users, rollback plan |
| Performance degradatie | Medium | ACL caching, query optimalisatie |
| Complex beheer | Laag | Goede UI, presets, documentatie |

---

## Success Criteria

### Fase 2 Compleet Wanneer:
- [ ] Alle bestaande permissions zijn gemigreerd naar ACL
- [ ] Alle users hebben dezelfde toegang als voorheen
- [ ] Geen errors in logs gerelateerd aan permissions

### Fase 3 Compleet Wanneer:
- [ ] Geen legacy permission code meer in gebruik
- [ ] Alle CRUD via ACL
- [ ] Unit tests passing

### Volledig Compleet Wanneer:
- [ ] Legacy tabellen verwijderd
- [ ] Documentatie up-to-date
- [ ] Performance acceptabel
