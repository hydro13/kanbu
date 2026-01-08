# ACL Implementatie Roadmap

> **Zie ook:** [ARCHITECTURE.md](./ARCHITECTURE.md) voor de volledige visie en technische specificaties.

## Status Overzicht

```
┌─────────────────────────────────────────────────────────────────────┐
│ FASE 1-3B: Foundation & Pure ACL                    [██████████] ✓  │
│ FASE 4: Resource Tree UI                            [██████████] ✓  │
│ FASE 4B: ACL-Only Groups Workflow                   [████████░░] ◐  │
│ FASE 4C: Extended Resource Hierarchy                [██████████] ✓  │
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

### 4B.1 Create Security Group in AclPage ✅

> Voeg [+] knop toe aan Security Groups sectie in ResourceTree.

#### UI Wijzigingen
- [x] "+" knop naast "Security Groups" header in ResourceTree
- [x] Create Security Group form in right panel (niet popup)
- [x] Na creatie: group verschijnt direct in tree (WebSocket update)
- [x] Na creatie: group automatisch geselecteerd
- [x] Delete knop voor Security Groups met confirmatie

#### Backend
- [x] Hergebruik `trpc.group.createSecurityGroup` procedure
- [x] WebSocket `group:created` event werkt al
- [x] Fix permission check (Super Admins kunnen nu groups maken)

---

### 4B.2 Legacy Frontend Verwijderen ✅

> Groups admin pagina's verwijderd - AclPage is nu single source of truth.

#### Verwijderd - Frontend
- [x] `apps/web/src/pages/admin/GroupListPage.tsx` - VERWIJDERD
- [x] `apps/web/src/pages/admin/GroupEditPage.tsx` - VERWIJDERD
- [x] Sidebar link naar `/admin/groups` - VERWIJDERD
- [x] Routes `/admin/groups` en `/admin/groups/:groupId` - VERWIJDERD
- [x] Exports uit `pages/admin/index.ts` - VERWIJDERD

#### Nog NIET Verwijderd - Backend (dependencies nog in gebruik)

> ⚠️ Deze services/procedures kunnen pas verwijderd worden na volledige ACL migratie.

| Component | Reden behouden |
|-----------|----------------|
| `groupPermissions.ts` | Gebruikt door permission middleware en lib/project.ts |
| `roleAssignmentService.ts` | Dependency van groupPermissions.ts |
| `roleAssignment.ts` procedures | Gebruikt door PermissionTreePage |
| Permission procedures in group.ts | Gebruikt door usePermissions hook en UI componenten |

Deze worden verwijderd in een latere fase wanneer:
1. Permission middleware volledig naar ACL is gemigreerd
2. usePermissions hook naar ACL is gemigreerd
3. PermissionTreePage is verwijderd of gemigreerd
4. Database tabellen zijn verwijderd

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

## VOLTOOID: Fase 4C - Extended Resource Hierarchy

> **Doel:** Volledige AD-style resource hiërarchie met Root, System, Dashboard, en Workspaces containers.
> ACL kan op elk niveau gezet worden met inheritance naar children.
> **Status:** ✅ Voltooid op 2026-01-08

### Achtergrond: Waarom Extended Hierarchy?

**Huidige situatie (te plat):**
```
Kanbu (Root) ← Geen ACL mogelijk
├── System ← Beperkt, alleen "admin" resource type
└── Workspaces ← ACL werkt, maar geen parent containers
    └── Projects
```

**Gewenste situatie (AD-style):**
```
Kanbu (Root) ← Domain Admins hier met inherit=true
│
├── System ← Container voor systeembeheer
│   ├── User Management
│   ├── Group Management
│   ├── LDAP Integration (future)
│   └── Database Management (future)
│
├── Dashboard ← Container voor dashboard features
│   ├── Dashboard Widget 1
│   └── Dashboard Widget 2
│
└── Workspaces ← Bestaande container
    ├── Workspace X
    │   └── Projects...
    └── Workspace Y
        └── Projects...
```

**Voordelen:**
- Domain Admins op Root met inherit → volledige systeemtoegang
- System Admins apart van Workspace Admins
- Dashboard features los beheerbaar
- Volledige AD-compatibiliteit

---

### 4C.1 Resource Types Uitbreiden

> Nieuwe resource types toevoegen aan het ACL model.

#### Database Schema Updates

```typescript
// Huidige resourceTypes: 'admin', 'workspace', 'project', 'profile'
// Nieuwe resourceTypes toevoegen:

resourceType: 'root'      // Kanbu root - alles erft hiervan
resourceType: 'system'    // System container (bestaand, hergebruiken)
resourceType: 'dashboard' // Dashboard container (nieuw)
```

#### Backend Updates
- [x] Update `AclEntry` validatie voor nieuwe resource types
- [x] Update `aclService.ts` met nieuwe resource types
- [x] Update `acl.ts` procedures voor nieuwe types
- [x] Inheritance logica: root → system/dashboard/workspaces

#### Bestanden
- `packages/shared/prisma/schema.prisma` (indien enum)
- `apps/api/src/services/aclService.ts`
- `apps/api/src/trpc/procedures/acl.ts`

---

### 4C.2 ResourceTree UI Uitbreiden

> Tree component aanpassen voor volledige hiërarchie.

#### UI Wijzigingen
- [x] Root niveau (Kanbu) klikbaar voor ACL
- [x] System als expandable container met sub-items
- [x] Dashboard als nieuwe expandable container
- [x] Workspaces container behouden zoals nu
- [x] Visuele indicators voor containers vs. items

#### Nieuwe Tree Structuur
```
📁 Kanbu (Root)              ← Klikbaar, ACL mogelijk
├── 📁 System                ← Container, ACL mogelijk
│   ├── 👤 User Management   ← Sub-item
│   ├── 👥 Group Management  ← Sub-item
│   └── ⚙️ Settings          ← Sub-item
├── 📁 Dashboard             ← Container, ACL mogelijk
│   └── (future items)
├── 📁 Workspaces            ← Container zoals nu
│   └── ...
└── 📁 Security Groups       ← Principals sectie (geen change)
```

#### Bestanden
- `apps/web/src/components/admin/ResourceTree.tsx`
- `apps/web/src/pages/admin/AclPage.tsx`

---

### 4C.3 Inheritance Logic

> ACL inheritance moet van root naar beneden werken.

#### Inheritance Hiërarchie
```
root (Kanbu)
├── system
│   ├── system:users
│   ├── system:groups
│   └── system:settings
├── dashboard
│   └── dashboard:* (future)
└── workspace (null = all)
    └── workspace:{id}
        └── project:{id}
```

#### Backend Logic
- [x] `checkPermission` moet parent chain controleren
- [x] Root permission met inherit → alles daaronder
- [x] System permission → alleen system sub-items
- [x] Bestaande workspace/project inheritance behouden

#### Voorbeeld Use Cases
| ACL Entry | Effect |
|-----------|--------|
| Domain Admins op `root` met inherit | Volledige toegang overal |
| System Admins op `system` met inherit | Alleen User/Group/Settings beheer |
| Workspace Admins op `workspace:1` | Alleen die workspace + projects |

---

### 4C.4 API Endpoint Updates

> Backend moet nieuwe resource types ondersteunen.

#### `acl.getResources` Uitbreiden
- [x] Return root resource
- [x] Return system container met sub-resources
- [x] Return dashboard container
- [x] Bestaande workspaces/projects behouden

#### `acl.list` Updates
- [x] Filter op root/system/dashboard resource types
- [x] Inheritance info tonen

---

### 4C.5 Verificatie

- [x] ACL kan gezet worden op Root (Kanbu)
- [x] ACL kan gezet worden op System container
- [x] ACL kan gezet worden op Dashboard container
- [x] Inheritance werkt van root naar beneden
- [x] Domain Admins op root → toegang overal
- [x] System Admins op system → alleen systeembeheer
- [x] Bestaande workspace/project ACL blijft werken
- [x] ResourceTree toont volledige hiërarchie
- [x] Geen breaking changes voor bestaande ACL entries
- [x] TypeCheck passed

---

### 4C.6 Future Extensions (niet in scope)

Deze items zijn voorbereid maar worden later geïmplementeerd:

| Item | Fase | Beschrijving |
|------|------|--------------|
| System sub-items | 4C+ | User Management, Group Management, Settings als aparte resources |
| Dashboard features | 5+ | Dashboard widgets als beveiligbare resources |
| LDAP Management | 9 | LDAP/AD sync configuratie |
| Database Management | 9 | Database backup/restore features |

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

### NOW - Fase 4B: Radicale Simplificatie (◐ In Progress)
1. **4B.1** - ✅ [+] knop voor Create Security Group in ResourceTree
2. **4B.1** - ✅ Create form in right panel (niet popup)
3. **4B.1** - ✅ Delete knop voor Security Groups
4. **4B.2** - ✅ Frontend legacy code verwijderd (GroupListPage, GroupEditPage, routes, sidebar)
5. **4B.3** - ⏳ Database cleanup (wacht op volledige ACL migratie)

> **Note:** Backend services (groupPermissions.ts, roleAssignmentService.ts) en permission procedures zijn nog in gebruik door middleware, usePermissions hook, en PermissionTreePage. Deze worden verwijderd na volledige ACL migratie.

### VOLTOOID - Fase 4C: Extended Resource Hierarchy ✅
6. **4C.1** - ✅ Resource types uitbreiden (root, system, dashboard)
7. **4C.2** - ✅ ResourceTree UI uitbreiden
8. **4C.3** - ✅ Inheritance logic implementeren
9. **4C.4** - ✅ API endpoints updaten

### NEXT - Fase 5: Scoped Data Access
10. **5.1** - ScopeService implementeren
11. **5.2** - Scoped user queries

### LATER - Fase 6-9
12. **6.x** - Admin panel scoping
13. **7.x** - UI element scoping
14. **8.x** - Database cleanup (legacy tabellen)
15. **9.x** - Advanced features (LDAP, audit, etc.)

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
- [x] [+] knop werkt in ResourceTree voor nieuwe Security Groups
- [x] Create form in right panel (niet popup)
- [x] Delete knop voor Security Groups
- [x] GroupListPage en GroupEditPage verwijderd
- [x] Sidebar link naar /admin/groups verwijderd
- [x] Routes /admin/groups verwijderd
- [x] AclPage is single source of truth voor group + ACL management

**Uitgesteld naar na ACL migratie:**
- [ ] groupPermissions.ts en roleAssignmentService.ts verwijderd
- [ ] roleAssignment.ts procedures verwijderd
- [ ] Permission procedures uit group.ts verwijderd
- [ ] Database tabellen (GroupPermission, Permission, RoleAssignment) verwijderd

### Fase 4C Compleet ✅
- [x] Resource types uitgebreid: root, system, dashboard
- [x] ResourceTree toont volledige hiërarchie (Root → System/Dashboard/Workspaces)
- [x] ACL kan gezet worden op Root niveau
- [x] ACL kan gezet worden op System container
- [x] ACL kan gezet worden op Dashboard container
- [x] Inheritance werkt van root naar beneden
- [x] Domain Admins op root → volledige toegang overal
- [x] Bestaande workspace/project ACL blijft werken

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
| 2026-01-08 | **Fase 4C VOLTOOID**: Extended Resource Hierarchy - root/system/dashboard types, ResourceTree UI, inheritance logic |
| 2026-01-08 | Fase 4B.2 voltooid: GroupListPage, GroupEditPage, sidebar link en routes verwijderd |
| 2026-01-08 | Note: Backend services behouden (dependencies in middleware/hooks) - verwijderen na ACL migratie |
| 2026-01-08 | Fase 4C toegevoegd: Extended Resource Hierarchy (Root, System, Dashboard containers) |
| 2026-01-08 | Fase 4B.1 voltooid: [+] knop, create form, delete knop voor Security Groups |
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
