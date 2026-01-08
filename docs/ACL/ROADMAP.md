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

## Fase 2: Migratie (Voltooid)

### 2.1 Voorbereidende Stappen
- [x] Backup maken van database
- [x] Audit van huidige WorkspaceUser entries (1 entry: robin → Kanbu-Playground OWNER)
- [x] Audit van huidige ProjectMember entries (1 entry: robin → LearnKanbo OWNER)
- [x] Audit van huidige GroupPermission entries (0 entries)

### 2.2 Migratie Uitvoeren
- [x] Verifieer dat alle users nog steeds toegang hebben
- [x] Valideer ACL entries in database
- [x] Alle legacy entries hebben corresponderende ACL entries

### 2.3 Verificatie
- [x] Test workspace listing voor alle users
- [x] Test workspace access voor alle users
- [x] Test project access voor alle users
- [x] Vergelijk ACL entries met legacy data - alle status OK

---

## Fase 3: Legacy Code Verwijderen (Voltooid)

### 3.1 PermissionService Cleanup
- [x] Verwijder legacy fallback uit `canAccessWorkspace()` - ACL check als primary
- [x] Verwijder legacy fallback uit `canAccessProject()` - ACL check als primary
- [x] Verwijder legacy fallback uit `getUserWorkspaces()` - ACL check als primary
- [x] Verwijder legacy fallback uit `getWorkspaceRole()` - ACL check als primary
- [x] Behoud legacy fallback voor backward compatibility (tijdelijk)

### 3.2 Workspace Procedures
- [x] Update `workspace.create` - maakt ACL entry + WorkspaceUser
- [x] Update `workspace.invite` - maakt ACL entry bij directe add
- [x] Update `workspace.addMember` - maakt ACL entry
- [x] Update `workspace.removeMember` - verwijdert ACL entry
- [x] Update `workspace.updateMemberRole` - update ACL entry
- [ ] Update `workspace.getMembers` - lees uit ACL (future enhancement)

### 3.3 Project Procedures
- [x] Update `project.create` - maakt ACL entry voor creator
- [x] Update `project.addMember` - maakt ACL entry
- [x] Update `project.removeMember` - verwijdert ACL entry
- [x] Update `project.updateMemberRole` - update ACL entry
- [ ] Update `project.getMembers` - lees uit ACL (future enhancement)

### 3.4 GroupPermission Cleanup (Deferred)
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

### High Priority (Voltooid)
1. ~~**Fase 3.1** - PermissionService cleanup~~ ✓
2. ~~**Fase 3.2** - Workspace procedures~~ ✓
3. ~~**Fase 3.3** - Project procedures~~ ✓

### Medium Priority (Korte termijn)
4. **Fase 3.4** - GroupPermission cleanup
5. **getMembers procedures** - Lees uit ACL ipv legacy tables

### Low Priority (Later)
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
- [x] Alle bestaande permissions zijn gemigreerd naar ACL
- [x] Alle users hebben dezelfde toegang als voorheen
- [x] Geen errors in logs gerelateerd aan permissions

### Fase 3 Compleet Wanneer:
- [x] ACL checks zijn primary authorization method
- [x] Alle CRUD operaties maken ook ACL entries aan
- [x] Typecheck passing
- [ ] Legacy fallback kan later verwijderd worden

### Volledig Compleet Wanneer:
- [ ] Legacy tabellen verwijderd
- [ ] Documentatie up-to-date
- [ ] Performance acceptabel
