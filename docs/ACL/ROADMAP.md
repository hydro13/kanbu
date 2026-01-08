# ACL Implementatie Roadmap

> **Zie ook:** [ARCHITECTURE.md](./ARCHITECTURE.md) voor de volledige visie en technische specificaties.

## Status Overzicht

```
┌─────────────────────────────────────────────────────────────────────┐
│ FASE 1-3B: Foundation & Pure ACL                    [██████████] ✓  │
│ FASE 4: Resource Tree UI                            [██████████] ✓  │
│ FASE 4B: ACL-Only Groups Workflow                   [──────────] ○  │
│ FASE 5: Scoped Data Access                          [──────────] ○  │
│ FASE 6: Scoped Admin Panel                          [──────────] ○  │
│ FASE 7: Scoped UI Elements                          [──────────] ○  │
│ FASE 8: Database Cleanup                            [──────────] ○  │
│ FASE 9: Advanced Features                           [──────────] ○  │
└─────────────────────────────────────────────────────────────────────┘

Legenda: ✓ Voltooid | ◐ In Progress | ○ Gepland
```

---

## VOLTOOID: Fase 1-3B (Foundation & Pure ACL)

<details>
<summary>Klik om voltooide fases te bekijken</summary>

### Fase 1: Foundation (Voltooid)

#### 1.1 Database & Core Service
- [x] AclEntry model in Prisma schema
- [x] AclService met bitmask permissies
- [x] Deny-first logic implementatie
- [x] Inheritance support (workspace → project)
- [x] Unit tests (15 tests passing)

#### 1.2 API Layer
- [x] tRPC procedures voor CRUD operaties
- [x] Authorization checks (requireAclManagement)
- [x] Principal lookup (users + groups)
- [x] Resource listing

#### 1.3 UI
- [x] ACL Manager pagina (`/admin/acl`)
- [x] Grant/Deny dialogs
- [x] Permission presets
- [x] Admin sidebar link

#### 1.4 Integration
- [x] PermissionService ACL checks
- [x] `getUserWorkspaces()` met ACL support
- [x] `getWorkspaceRole()` met ACL support

---

### Fase 2: Migratie (Voltooid)

#### 2.1 Voorbereidende Stappen
- [x] Backup maken van database
- [x] Audit van huidige WorkspaceUser entries
- [x] Audit van huidige ProjectMember entries
- [x] Audit van huidige GroupPermission entries

#### 2.2 Migratie Uitvoeren
- [x] Verifieer dat alle users nog steeds toegang hebben
- [x] Valideer ACL entries in database
- [x] Alle legacy entries hebben corresponderende ACL entries

#### 2.3 Verificatie
- [x] Test workspace listing voor alle users
- [x] Test workspace access voor alle users
- [x] Test project access voor alle users

---

### Fase 3: Hybride ACL (Voltooid)

- [x] ACL check als primary in alle PermissionService methods
- [x] Legacy fallback behouden (voor backward compatibility)
- [x] Workspace procedures schrijven naar BEIDE systemen
- [x] Project procedures schrijven naar BEIDE systemen

---

### Fase 3B: Pure ACL Migratie (Voltooid)

> **BELANGRIJK:** `groupPermissionService` is een APART systeem van ACL:
> - **ACL (aclService)**: Bitmask permissions (R,W,X,D,P) voor workspace/project toegang
> - **Group Permissions (groupPermissionService)**: LDAP/AD-style named permissions

#### 3B.1 getMembers uit ACL lezen
- [x] `workspace.getMembers` - lees uit AclEntry ipv WorkspaceUser
- [x] `project.getMembers` - lees uit AclEntry ipv ProjectMember
- [x] Map ACL permissions naar UI roles (ADMIN/MEMBER/VIEWER)

#### 3B.2 Stop Dubbel Schrijven
- [x] Alle workspace procedures schrijven ALLEEN naar ACL
- [x] Alle project procedures schrijven ALLEEN naar ACL

#### 3B.3 Legacy Fallback Verwijderen
- [x] Verwijder legacy fallback uit alle PermissionService methods
- [x] Verwijder `groupPermissionService` import uit PermissionService
- [x] Verwijder `groupPermissionService` import uit workspace.ts
- [x] Behoud `groupPermissionService` in admin.ts, group.ts (APART SYSTEEM)

#### 3B.4 Verificatie
- [x] Typecheck passing (code compileert)
- [x] UI Verificatie (handmatig testen)

</details>

---

## VOLTOOID: Fase 4 - Resource Tree UI

> **Doel:** VSCode-style hiërarchische weergave van resources met correcte structuur.

<details>
<summary>Klik om voltooide fase te bekijken</summary>

### 4.1 Tree Component
- [x] `ResourceTree.tsx` component gemaakt
- [x] VSCode-style expand/collapse gedrag
- [x] Klikken op folder opent EN selecteert
- [x] Projects genest onder workspaces

### 4.2 Volledige Hiërarchie
- [x] Root niveau tonen: "Kanbu" of tenant naam
- [x] "Workspaces" als expandable container
- [x] Elke workspace toont "Projects" container
- [x] Breadcrumb pad in ACL header

### 4.3 Security Groups Sectie
- [x] Aparte sectie voor Security Groups
- [x] Toon bestaande groups uit database
- [x] Groups zijn PRINCIPALS (wie rechten krijgt)
- [x] Duidelijke visuele scheiding van Resources

### 4.4 Real-time Updates
- [x] WebSocket events voor ACL changes (grant/deny/delete)
- [x] WebSocket events voor Group changes (create/update/delete)
- [x] WebSocket events voor Group member changes (add/remove)
- [x] Session storage voor tree state persistence

### 4.5 Verificatie
- [x] Resource tree toont volledige hiërarchie
- [x] Security Groups sectie zichtbaar
- [x] Klikken selecteert correct resource type
- [x] ACL entries laden voor geselecteerde resource

</details>

---

## GEPLAND: Fase 4B - Radicale Simplificatie

> **Doel:** Eén admin panel voor alles: AclPage wordt de single source of truth.
> Verwijder ALLE legacy permission systemen en aparte Groups pagina's.

### Achtergrond: Waarom Radicale Simplificatie?

**Huidige situatie (onnodig complex):**
```
/admin/groups      → GroupListPage (lijst groups, create button)
/admin/groups/:id  → GroupEditPage (members, permissions, assignments)
/admin/acl         → AclPage (resources, ACL entries, GroupMembersPanel)
```

**Probleem:** Dubbele functionaliteit, verwarrend, legacy code.

**Oplossing:** Alles in AclPage, rest weggooien.

```
/admin/acl         → AclPage (ALLES hier)
├── Resource Tree
│   ├── Kanbu (root)
│   ├── Workspaces → Projects
│   └── Security Groups [+]  ← Create groups hier
│
└── Right Panel
    ├── Resource selected → ACL entries
    └── Group selected → Members beheren
```

---

### 4B.1 Create Security Group in AclPage

> Voeg [+] knop toe aan Security Groups sectie in ResourceTree.

#### UI Wijzigingen
- [ ] "+" knop naast "Security Groups" header in ResourceTree
- [ ] Create Security Group dialog (naam, displayName, description)
- [ ] Na creatie: group verschijnt direct in tree (WebSocket update)
- [ ] Na creatie: group automatisch geselecteerd

#### Backend
- [ ] Hergebruik `trpc.group.createSecurityGroup` procedure
- [ ] WebSocket `group:created` event werkt al

#### Bestanden
- `apps/web/src/components/admin/ResourceTree.tsx`
- `apps/web/src/pages/admin/AclPage.tsx`

---

### 4B.2 Legacy Code Verwijderen

> Alle oude permission systemen en Groups pagina's weg.

#### Te Verwijderen - Frontend Pages
- [ ] `apps/web/src/pages/admin/GroupListPage.tsx` - HELE FILE WEG
- [ ] `apps/web/src/pages/admin/GroupEditPage.tsx` - HELE FILE WEG
- [ ] Sidebar link naar `/admin/groups` verwijderen

#### Te Verwijderen - Backend Services
- [ ] `apps/api/src/services/groupPermissions.ts` - HELE FILE WEG
- [ ] `apps/api/src/services/roleAssignmentService.ts` - HELE FILE WEG

#### Te Verwijderen - Backend Procedures
- [ ] `apps/api/src/trpc/procedures/group.ts` - Opschonen:
  - ❌ `listPermissions` - WEG
  - ❌ `getGroupPermissions` - WEG
  - ❌ `grantPermission` - WEG
  - ❌ `revokePermission` - WEG
  - ✅ `list` - BEHOUDEN (voor ResourceTree)
  - ✅ `get` - BEHOUDEN
  - ✅ `createSecurityGroup` - BEHOUDEN
  - ✅ `delete` - BEHOUDEN
  - ✅ `addMember` - BEHOUDEN (voor GroupMembersPanel)
  - ✅ `removeMember` - BEHOUDEN
  - ✅ `getMembers` - BEHOUDEN
  - ✅ `listMembers` - BEHOUDEN
- [ ] `apps/api/src/trpc/procedures/roleAssignment.ts` - HELE FILE WEG

#### Te Verwijderen - Routes
- [ ] Route `/admin/groups` uit router config
- [ ] Route `/admin/groups/:id` uit router config

---

### 4B.3 Database Cleanup

> Legacy tabellen verwijderen (geen data om te migreren).

#### Te Verwijderen - Schema
- [ ] `GroupPermission` model uit schema.prisma
- [ ] `Permission` model uit schema.prisma
- [ ] `RoleAssignment` model uit schema.prisma
- [ ] Gerelateerde enums (AccessType indien unused)

#### Prisma Migration
- [ ] Backup maken (voor zekerheid)
- [ ] `npx prisma migrate dev --name remove_legacy_permission_tables`
- [ ] Verify migration succesvol

---

### 4B.4 Verificatie

- [ ] AclPage werkt volledig standalone
- [ ] Security Groups aanmaken via [+] knop
- [ ] Members beheren via GroupMembersPanel
- [ ] ACL Grant/Deny werkt voor groups
- [ ] Real-time updates werken
- [ ] Geen 404's op oude routes
- [ ] Geen TypeScript errors
- [ ] Geen runtime errors
- [ ] Build succesvol

---

### 4B.5 Wat Blijft Behouden

| Component | Locatie | Functie |
|-----------|---------|---------|
| `AclPage` | `/admin/acl` | Single admin panel |
| `ResourceTree` | Component | Tree navigatie |
| `GroupMembersPanel` | Component | Members beheren |
| `aclService` | Backend | ACL CRUD |
| `group.createSecurityGroup` | Procedure | Groups aanmaken |
| `group.addMember/removeMember` | Procedure | Members beheren |
| `group.list/get` | Procedure | Groups ophalen |
| WebSocket events | Backend | Real-time updates |

---

## GEPLAND: Fase 5 - Scoped Data Access

> **Doel:** Alle data queries filteren op basis van user's scope.
> **Zie:** [ARCHITECTURE.md](./ARCHITECTURE.md) sectie 5 voor details.

### 5.1 ScopeService Implementeren
- [ ] Maak `services/scopeService.ts`
- [ ] Implementeer `getUserScope(userId)` method
- [ ] Bepaal scope level: system, workspace, of project
- [ ] Return lijst van accessible workspaceIds en projectIds
- [ ] Unit tests voor scope determination

```typescript
// Te implementeren interface
interface UserScope {
  level: 'system' | 'workspace' | 'project'
  workspaceIds: number[]
  projectIds: number[]
  permissions: {
    canManageUsers: boolean
    canManageGroups: boolean
    canManageWorkspaces: boolean
    canAccessAdminPanel: boolean
  }
}
```

### 5.2 Scoped Queries - Users
- [ ] `getUsersInScope(userId)` - alleen users in scope
- [ ] Update contact list queries
- [ ] Update user search/select components
- [ ] Update member lists

### 5.3 Scoped Queries - Groups
- [ ] `getGroupsInScope(userId)` - alleen groups in scope
- [ ] Update group selectors
- [ ] Update group management views

### 5.4 Scoped Queries - Workspaces & Projects
- [ ] `getWorkspacesInScope(userId)` - alleen toegankelijke workspaces
- [ ] `getProjectsInScope(userId, workspaceId?)` - alleen toegankelijke projects
- [ ] Update sidebar workspace list
- [ ] Update project selectors

### 5.5 Verificatie
- [ ] Workspace admin ziet alleen eigen workspace users
- [ ] Contact list gefilterd per scope
- [ ] Geen data leakage tussen workspaces
- [ ] Performance < 50ms per scope check

---

## GEPLAND: Fase 6 - Scoped Admin Panel

> **Doel:** Admin panel toont gefilterde views per scope level.

### 6.1 Admin Scope Detection
- [ ] Bepaal admin scope bij page load
- [ ] System admin vs Workspace admin detection
- [ ] Store scope in React context

### 6.2 Workspace Admin View
- [ ] Toon alleen eigen workspace(s) in admin
- [ ] Filter Users list op workspace members
- [ ] Filter Groups list op workspace groups
- [ ] Verberg system-wide settings

### 6.3 ACL Manager Scoping
- [ ] Resource tree gefilterd per scope
- [ ] Workspace admin kan alleen eigen workspace ACLs beheren
- [ ] Verberg resources buiten scope

### 6.4 Admin Navigation
- [ ] Menu items per scope level
- [ ] Verberg "All Users" voor workspace admins
- [ ] Verberg "System Settings" voor non-system admins

### 6.5 Verificatie
- [ ] Workspace admin ziet gefilterd admin panel
- [ ] Geen toegang tot out-of-scope resources
- [ ] System admin ziet volledig panel

---

## GEPLAND: Fase 7 - Scoped UI Elements

> **Doel:** Alle UI elementen respecteren user's scope.

### 7.1 Conditionele Menu's
- [ ] Sidebar items gebaseerd op permissions
- [ ] Verberg "Administration" als geen admin toegang
- [ ] Workspace menu items per workspace access

### 7.2 Component-Level Permissions
- [ ] `<PermissionGate permission="..." resource="...">` component
- [ ] Conditioneel renderen van buttons/links
- [ ] "Edit" buttons alleen als W permission

### 7.3 Breadcrumb Scoping
- [ ] Breadcrumbs tonen alleen toegankelijke path
- [ ] Klikbare links alleen voor accessible resources

### 7.4 Search & Filter Scoping
- [ ] Global search respecteert scope
- [ ] User/project/task zoeken gefilterd

### 7.5 Verificatie
- [ ] Geen UI elementen voor ontoegankelijke resources
- [ ] Menu's dynamisch per user
- [ ] Alle interactive elements scope-aware

---

## GEPLAND: Fase 8 - Database Cleanup

> **Doel:** Legacy tabellen verwijderen na succesvolle scoped implementatie.
>
> **LET OP:** `groupPermissionService` is een APART systeem en moet NIET verwijderd worden.

### 8.1 Legacy Tabellen Verwijderen
- [ ] Verwijder WorkspaceUser model uit schema.prisma
- [ ] Verwijder ProjectMember model uit schema.prisma
- [ ] Verwijder GroupPermission model uit schema.prisma (indien niet gebruikt)
- [ ] Verwijder gerelateerde enums (WorkspaceRole, ProjectRole indien unused)

### 8.2 Legacy Code Opruimen
- [ ] Verwijder unused imports in procedures
- [ ] Cleanup lib/project.ts (deprecated functies)
- [ ] Cleanup PermissionService comments

### 8.3 Database Migratie
- [ ] Genereer Prisma migration
- [ ] Test migration op dev database
- [ ] Backup productie database voor migratie
- [ ] Execute migration

### 8.4 Verificatie
- [ ] Typecheck passing na schema wijzigingen
- [ ] Alle tests passing
- [ ] Applicatie volledig functioneel

---

## GEPLAND: Fase 9 - Advanced Features

> **Doel:** Enterprise-grade features toevoegen.

### 9.1 Audit Logging
- [ ] Log alle ACL wijzigingen
- [ ] Wie, wanneer, wat gewijzigd
- [ ] Permission change history per resource
- [ ] Audit viewer in admin panel

### 9.2 LDAP/AD Sync
- [ ] Sync AD groups naar Kanbu groups
- [ ] Automatische ACL updates bij groepswijzigingen
- [ ] OU-based permission inheritance
- [ ] Scheduled sync jobs

### 9.3 Task-Level ACL
- [ ] ACL support voor individuele tasks
- [ ] Private tasks (alleen assignee + creator)
- [ ] Task visibility inheritance van project

### 9.4 Bulk Operations
- [ ] Bulk grant/revoke voor meerdere users
- [ ] Template-based permission sets
- [ ] Copy permissions van andere resource

### 9.5 Advanced UI
- [ ] Permission matrix view (users x resources)
- [ ] Effective permissions calculator
- [ ] "What-if" simulatie voor nieuwe permissies
- [ ] Import/export van ACL configuratie

### 9.6 API Keys & Service Accounts
- [ ] ACL voor API keys
- [ ] Service account permissies
- [ ] Scoped tokens

---

## Prioriteiten

### NOW - Fase 4B: Radicale Simplificatie
1. **4B.1** - [+] knop voor Create Security Group in ResourceTree
2. **4B.2** - Legacy code verwijderen (GroupListPage, GroupEditPage, services)
3. **4B.3** - Database cleanup (GroupPermission, Permission, RoleAssignment tabellen)

### NEXT - Fase 5: Scoped Data Access
4. **5.1** - ScopeService implementeren
5. **5.2** - Scoped user queries

### THEN - Fase 6-7: Scoped UI
6. **6.x** - Admin panel scoping
7. **7.x** - UI element scoping

### LATER - Fase 8-9
8. **8.x** - Database cleanup
9. **9.x** - Advanced features

---

## Risico's & Mitigaties

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Breaking changes bij scope filtering | Hoog | Stap voor stap, feature flags |
| Performance bij scope checks | Medium | Caching, optimized queries |
| Data leakage tussen scopes | Kritiek | Extensive testing, security review |
| Complexiteit scope logic | Medium | Duidelijke ScopeService API |
| Backward compatibility | Hoog | Fallback naar unscoped als nodig |

---

## Success Criteria

### Fase 4 Compleet ✓
- [x] Resource tree toont volledige hiërarchie
- [x] Security Groups sectie werkt
- [x] VSCode-style navigatie werkt
- [x] Real-time WebSocket updates

### Fase 4B Compleet Wanneer:
- [ ] [+] knop werkt in ResourceTree voor nieuwe Security Groups
- [ ] GroupListPage en GroupEditPage verwijderd
- [ ] groupPermissions.ts en roleAssignmentService.ts verwijderd
- [ ] roleAssignment.ts procedures verwijderd
- [ ] Database tabellen (GroupPermission, Permission, RoleAssignment) verwijderd
- [ ] Sidebar link naar /admin/groups verwijderd
- [ ] AclPage is single source of truth voor group + ACL management

### Fase 5 Compleet Wanneer:
- [ ] ScopeService geïmplementeerd en getest
- [ ] Alle data queries scoped
- [ ] Contact list gefilterd per scope

### Fase 6 Compleet Wanneer:
- [ ] Workspace admin ziet gefilterd admin panel
- [ ] ACL Manager scoped per user

### Fase 7 Compleet Wanneer:
- [ ] Alle menu's dynamisch per scope
- [ ] Alle UI elements respecteren permissions

### Fase 8 Compleet Wanneer:
- [ ] Legacy tabellen verwijderd
- [ ] Database migratie succesvol
- [ ] Geen regressies

### Fase 9 Compleet Wanneer:
- [ ] Audit logging actief
- [ ] LDAP/AD sync werkend (indien nodig)
- [ ] Task-level ACL geïmplementeerd

---

## Referenties

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Volledige architectuur en visie
- [README.md](./README.md) - ACL basis documentatie
- [MIGRATION.md](./MIGRATION.md) - Migratie handleiding

---

## Changelog

| Datum | Wijziging |
|-------|-----------|
| 2026-01-08 | Fase 4B herschreven: Radicale Simplificatie (alles weg behalve AclPage) |
| 2026-01-08 | Beslissing: RoleAssignment systeem volledig verwijderen |
| 2026-01-08 | Beslissing: Groups admin pages volledig verwijderen |
| 2026-01-08 | Fase 4B toegevoegd: ACL-Only Groups Workflow |
| 2026-01-08 | Fase 4 gemarkeerd als voltooid |
| 2026-01-08 | Real-time WebSocket updates toegevoegd aan Fase 4 |
| 2026-01-08 | GroupPermission systeem gemarkeerd als deprecated |
| 2026-01-08 | Roadmap herschreven met scoped permission fases |
| 2026-01-08 | Fase 1-3B gemarkeerd als voltooid |
| 2026-01-08 | Fase 4-9 toegevoegd voor scoped permissions |
