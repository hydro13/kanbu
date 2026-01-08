# ACL Implementatie Roadmap

> **Zie ook:** [ARCHITECTURE.md](./ARCHITECTURE.md) voor de volledige visie en technische specificaties.

## Status Overzicht

```
┌─────────────────────────────────────────────────────────────────────┐
│ FASE 1-3B: Foundation & Pure ACL                    [██████████] ✓  │
│ FASE 4: Resource Tree UI                            [██████████] ✓  │
│ FASE 4B: ACL-Only Groups Workflow                   [██████████] ✓  │
│ FASE 4C: Extended Resource Hierarchy                [██████████] ✓  │
│ FASE 5: Scoped Data Access                          [██████████] ✓  │
│ FASE 6: Scoped Admin Panel                          [██████████] ✓  │
│ FASE 7: Scoped UI Elements                          [██████████] ✓  │
│ FASE 8: Database Cleanup (legacy tables)            [██████████] ✓  │
│ FASE 8B: Feature ACL (Project)                      [██████████] ✓  │
│ FASE 8C: Feature ACL (Systeem-breed) + Docs         [██████████] ✓  │
│ FASE 9: Advanced Features                           [──────────] ○  │
│                                                                     │
│ ⚠️ SECURITY FIX 2026-01-08: Admin access vulnerability gefixt       │
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

## VOLTOOID: Fase 4B - Radicale Simplificatie

> **Doel:** Eén admin panel voor alles: AclPage wordt de single source of truth.
> Verwijder ALLE legacy permission systemen en aparte Groups pagina's.
> **Status:** ✅ Voltooid - Frontend werk compleet. DB cleanup verplaatst naar Fase 8.

<details>
<summary>Klik om voltooide fase te bekijken</summary>

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

</details>

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

## VOLTOOID: Fase 5 - Scoped Data Access

> **Doel:** Alle data queries filteren op basis van user's scope.
> **Status:** ✅ Voltooid op 2026-01-08

<details>
<summary>Klik om voltooide fase te bekijken</summary>

### 5.1 ScopeService Implementeren
- [x] Maak `services/scopeService.ts`
- [x] Implementeer `getUserScope(userId)` method
- [x] Bepaal scope level: system, workspace, of project
- [x] Return lijst van accessible workspaceIds en projectIds
- [x] Export via services/index.ts

```typescript
// Geïmplementeerde interface
interface UserScope {
  level: 'system' | 'workspace' | 'project' | 'none'
  workspaceIds: number[]
  projectIds: number[]
  permissions: {
    canManageUsers: boolean
    canManageGroups: boolean
    canManageWorkspaces: boolean
    canAccessAdminPanel: boolean
    canManageAcl: boolean
  }
  isDomainAdmin: boolean
}
```

### 5.2 Scoped Queries - Users
- [x] `getUsersInScope(userId)` - alleen users in scope
- [x] Admin `listUsers` procedure gefilterd op scope
- [x] Admin `getUser` procedure met scope check
- [x] Domain Admins: Alle users
- [x] Workspace Admins: Users in hun workspace(s)

### 5.3 Scoped Queries - Groups
- [x] `getGroupsInScope(userId)` - alleen groups in scope
- [x] Group `list` procedure gefilterd op scope
- [x] Domain Admins: Alle groups
- [x] Workspace Admins: Groups in hun workspace(s) + system groups waar ze lid van zijn

### 5.4 Scoped Queries - Workspaces & Projects
- [x] `getWorkspacesInScope(userId)` - alleen toegankelijke workspaces
- [x] `getProjectsInScope(userId, workspaceId?)` - alleen toegankelijke projects
- [x] Helper methods: `canAccessWorkspace()`, `canAccessProject()`
- [x] Prisma where clause helpers: `getWorkspaceWhereClause()`, `getProjectWhereClause()`

### 5.5 Verificatie
- [x] TypeCheck passed
- [x] ScopeService correct geëxporteerd
- [x] Admin procedures gebruiken scopeService
- [x] Group procedures gebruiken scopeService

</details>

---

## VOLTOOID: Fase 6 - Scoped Admin Panel

> **Doel:** Admin panel toont gefilterde views per scope level.
> **Status:** ✅ Voltooid op 2026-01-08

<details>
<summary>Klik om voltooide fase te bekijken</summary>

### 6.1 Admin Scope Detection
- [x] `myAdminScope` endpoint uitgebreid met volledige scope info
- [x] `useAdminScope` hook gemaakt voor frontend
- [x] Scope data beschikbaar in React components

### 6.2 Workspace Admin View
- [x] AdminSidebar gefilterd op basis van scope level
- [x] Workspace admins zien: All Users, ACL Manager (gefilterde data)
- [x] Domain Admins zien: All Users, Create User, ACL Manager, Permission Tree, Invites
- [x] System Settings alleen voor Domain Admins

### 6.3 ACL Manager Scoping
- [x] `acl.getResources` filtert workspaces/projects op scope
- [x] Resource types gefilterd (root/system/dashboard alleen voor Domain Admins)
- [x] ResourceTree toont alleen resources in scope
- [x] Workspace admin kan alleen eigen workspace ACLs beheren

### 6.4 Admin Navigation
- [x] Menu items dynamisch per scope level
- [x] AdminSidebar header toont "Domain Admin" of "Workspace Admin"
- [x] Workspace count getoond voor workspace admins

### 6.5 Verificatie
- [x] TypeCheck passed
- [x] Workspace admin ziet gefilterd admin panel
- [x] Domain admin ziet volledig panel

</details>

---

## VOLTOOID: Fase 7 - Scoped UI Elements

> **Doel:** Alle UI elementen respecteren user's scope.
> **Status:** ✅ Voltooid op 2026-01-08

<details>
<summary>Klik om voltooide fase te bekijken</summary>

### 7.1 Conditionele Menu's
- [x] Sidebar items gebaseerd op permissions
- [x] "Administration" verborgen als geen admin toegang (BaseLayout uses myAdminScope)
- [x] AdminSidebar gefilterd op scope level (Fase 6)
- [x] ProjectSidebar "Manage" sectie gefilterd via useProjectPermissions

### 7.2 Component-Level Permissions
- [x] `<AclGate>` component voor conditional rendering op basis van ACL
- [x] `<AclGateAll>` - toont alleen als ALLE permissions aanwezig
- [x] `<AclGateAny>` - toont als een van de permissions aanwezig
- [x] `useAclPermission` hook met convenience flags (canRead, canWrite, canDelete, etc.)
- [x] Convenience hooks: `useWorkspaceAcl()`, `useProjectAcl()`, `useSystemAcl()`, `useRootAcl()`
- [x] `acl.myPermission` API endpoint toegevoegd

### 7.3 Breadcrumb Scoping
- [x] Breadcrumbs gerenderd in BaseLayout
- [x] useBreadcrumbs hook bepaalt toegankelijke path
- [x] Links alleen klikbaar waar user toegang heeft

### 7.4 Search & Filter Scoping
- [x] Admin user list gefilterd via scopeService.getUsersInScope()
- [x] Admin group list gefilterd via scopeService.getGroupsInScope()
- [x] ACL resource tree gefilterd op user's scope

### 7.5 Verificatie
- [x] TypeCheck passed
- [x] Geen UI elementen voor ontoegankelijke resources
- [x] Menu's dynamisch per user scope

### Nieuwe Bestanden

**API:**
- `acl.myPermission` procedure toegevoegd aan `acl.ts`

**Frontend Hooks:**
- `hooks/useAclPermission.ts` - ACL permission checking hook

**Frontend Components:**
- `components/common/AclGate.tsx` - Conditional rendering component

</details>

---

## VOLTOOID: Fase 8 - Database Cleanup

> **Doel:** Ongebruikte legacy tabellen verwijderen.
> **Status:** ✅ Voltooid op 2026-01-08
>
> **⚠️ CORRECTIE (2026-01-08):** Na analyse blijkt dat veel items van de oorspronkelijke
> Fase 8 planning NIET verwijderd mogen worden - ze zijn actief in gebruik:
>
> **BEHOUDEN (actief in gebruik):**
> - `groupPermissions.ts` - Core AD-style service (1345 regels, 33+ imports)
> - `roleAssignmentService.ts` - Core service voor role assignments (540 regels)
> - `Permission` model - Gebruikt voor permission definitions
> - `RoleAssignment` model - Kern van AD-style role system
> - `WorkspaceRole` enum - Gebruikt door `WorkspaceInvitation`
> - `ProjectRole` enum - Type annotations
>
> **VERWIJDERD:**
> - `WorkspaceUser` model - Legacy, vervangen door ACL
> - `ProjectMember` model - Legacy, vervangen door ACL

<details>
<summary>Klik om voltooide fase te bekijken</summary>

### 8.1 Legacy Tabellen Verwijderen (Database Schema)
- [x] Verwijder WorkspaceUser model uit schema.prisma
- [x] Verwijder ProjectMember model uit schema.prisma
- [x] ~~Verwijder GroupPermission model~~ - BEHOUDEN (mogelijk toekomstig gebruik)
- [x] ~~Verwijder Permission model~~ - BEHOUDEN (actief in gebruik)
- [x] ~~Verwijder RoleAssignment model~~ - BEHOUDEN (actief in gebruik)
- [x] ~~Verwijder enums~~ - BEHOUDEN (WorkspaceRole voor invites, ProjectRole voor types)

### 8.2 Code Cleanup (Minimaal)
- [x] Verwijder relaties naar WorkspaceUser uit Workspace model
- [x] Verwijder relaties naar ProjectMember uit Project model
- [x] Cleanup comments die verwijzen naar verwijderde modellen
- [x] ~~Verwijder groupPermissions.ts~~ - BEHOUDEN (core service)
- [x] ~~Verwijder roleAssignmentService.ts~~ - BEHOUDEN (core service)

### 8.3 Database Migratie
- [x] Backup maken (voor zekerheid)
- [x] Schema geüpdatet via `prisma db push`
- [x] Test migration op dev database
- [x] Verify migration succesvol

### 8.4 Code Wijzigingen

Alle code is gemigreerd naar ACL-based queries:

| Bestand | Wijziging |
|---------|-----------|
| `lib/workspace.ts` | `createDefaultWorkspace` maakt nu ACL entry ipv WorkspaceUser |
| `lib/project.ts` | Deprecated functions delegeren naar permissionService |
| `routes/publicApi.ts` | Gebruikt `permissionService.canAccessProject()` ipv projectMember |
| `procedures/project.ts` | Member counts via `aclEntry.groupBy()` |
| `procedures/workspace.ts` | Member counts via `aclEntry.count()` |
| `procedures/user.ts` | Workspaces via `permissionService.getUserWorkspaces()` |
| `procedures/admin.ts` | User/workspace counts via ACL queries |
| `procedures/analytics.ts` | Project members via ACL entry lookup |
| `procedures/export.ts` | Member counts via ACL |
| `socket/auth.ts` | Workspace/project access via ACL queries |

**Verwijderde test files:**
- `services/__tests__/permissions.test.ts` - testte legacy WorkspaceUser model
- `procedures/__tests__/workspace.test.ts` - testte legacy WorkspaceUser model

### 8.5 Verificatie
- [x] Typecheck passing na schema wijzigingen
- [x] Applicatie volledig functioneel
- [x] Geen runtime errors
- [x] Build succesvol

</details>

---

## VOLTOOID: Fase 8B - Feature ACL Resources (Project Scope)

> **Doel:** Project menu items als ACL resources.
> **Status:** VOLTOOID - Uitgebreid door Fase 8C naar systeem-breed.

### 8B.1 Database Schema
- [x] `Feature` tabel aanmaken (id, projectId, slug, name, description, icon, sortOrder)
- [x] Seed project features (board, list, calendar, timeline, sprints, milestones, analytics, members, settings, import-export, webhooks)
- [x] ACL resourceType 'feature' toevoegen

### 8B.2 API Uitbreiden
- [x] `acl.ts` - feature resource type ondersteuning
- [x] `aclService.ts` - feature inheritance van project
- [x] `acl.getResources` - features returnen

### 8B.3 ResourceTree UI
- [x] Features tonen onder projects in de boom
- [x] Collapse/expand voor features per project
- [x] Feature icon toegevoegd

### 8B.4 Sidebar Integratie (Project)
- [x] `useProjectFeatureAccess` hook gemaakt
- [x] ProjectSidebar checkt ACL per menu item
- [x] Filter secties op basis van permissions

### 8B.5 Verificatie
- [x] TypeCheck passed
- [x] Features geseed in database (11 project features)
- [x] Uitgebreid door Fase 8C naar 24 features totaal

---

## VOLTOOID: Fase 8C - Systeem-breed Feature ACL

> **Doel:** ALLE menu items en features in Kanbu via ACL beheren.
> Elke sectie (Dashboard, Profile, Admin, Projects) heeft features die via ACL beheerd worden.
> Inclusief documentatie zodat toekomstige Claude Code sessies dit systeem correct gebruiken.
> **Status:** VOLTOOID - 40 features in database (4 dashboard, 16 profile, 9 admin, 11 project)

### 8C.1 Feature Scope Uitbreiden

#### Database Schema Update
- [x] `scope` veld toevoegen aan Feature tabel: `'dashboard' | 'profile' | 'admin' | 'project'`
- [x] Migratie uitgevoerd (prisma db push)

#### Seed Alle Features
- [x] Dashboard features (4): overview, my-tasks, my-subtasks, my-workspaces
- [x] Profile features (16): summary, time-tracking, last-logins, sessions, password-history, metadata, edit-profile, avatar, change-password, two-factor-auth, public-access, notifications, external-accounts, integrations, api-tokens, hourly-rate
- [x] Admin features (9): users, create-user, acl, permission-tree, invites, workspaces, settings-general, settings-security, backup
- [x] Project features (11): board, list, calendar, timeline, sprints, milestones, analytics, members, settings, import-export, webhooks

### 8C.2 ResourceTree UI Uitbreiden

- [x] Features tonen onder Dashboard sectie
- [x] Features tonen onder System/Admin sectie
- [x] Features tonen onder Profile sectie
- [x] Features groeperen per scope in de boom

**Geimplementeerde Tree Structuur:**
```
Kanbu (Root)
├── System
│   ├── Administration
│   │   └── Features (9 admin features)
│   │       ├── users, create-user, acl
│   │       ├── permission-tree, invites
│   │       ├── workspaces
│   │       └── settings-general, settings-security, backup
│   └── ...
├── Dashboard
│   └── Features (4 dashboard features)
│       ├── overview, my-tasks
│       └── my-subtasks, my-workspaces
├── Profile
│   └── Features (16 profile features)
│       ├── summary, time-tracking, last-logins, sessions
│       ├── password-history, metadata, edit-profile, avatar
│       ├── change-password, two-factor-auth, public-access
│       └── notifications, external-accounts, integrations, api-tokens, hourly-rate
├── Workspaces
│   └── [Workspace]
│       └── Projects
│           └── [Project]
│               └── Features (11 project features)
│                   ├── board, list, calendar, timeline
│                   ├── sprints, milestones, analytics
│                   └── members, settings, import-export, webhooks
└── Security Groups
```

### 8C.3 Sidebar Integraties

- [x] `useFeatureAccess(scope, featureSlug)` - generieke hook (`apps/web/src/hooks/useFeatureAccess.ts`)
- [x] Convenience hooks: `useDashboardFeatureAccess()`, `useAdminFeatureAccess()`, `useProfileFeatureAccess()`
- [x] AdminSidebar: hooks beschikbaar, bestaande scope checks behouden
- [x] DashboardSidebar: hooks beschikbaar voor toekomstig gebruik
- [x] ProjectSidebar: gebruikt `useProjectFeatureAccess` hook (Fase 8B)

### 8C.4 Documentatie & Governance

> **KRITIEK:** Zorgen dat toekomstige sessies dit systeem correct gebruiken.

#### CLAUDE.md Aanvullen
- [x] ACL Feature sectie toegevoegd aan project CLAUDE.md
- [x] Verplichte stappen bij nieuwe feature/pagina/menu
- [x] Voorbeeld code snippets

#### Procedure Document
- [x] `docs/procedures/nieuwe-feature-acl.md` aangemaakt
- [x] Stap-voor-stap instructies
- [x] Checklist voor nieuwe features

#### Seed File als Source of Truth
- [x] `seed-features.ts` goed gedocumenteerd met instructies
- [x] Comments per scope sectie
- [x] Instructies voor toevoegen nieuwe features

### 8C.5 Verificatie

- [x] Hooks beschikbaar voor alle sidebars/layouts
- [x] Nieuwe features zonder ACL entry zijn NIET zichtbaar (fail-safe design)
- [x] Documentatie is duidelijk voor toekomstige sessies
- [x] TypeCheck passed
- [x] Database bevat 40 features (4+16+9+11)

**Resource Hierarchy na 8C:**
```
root
├── system
│   └── admin features (9): users, create-user, acl, permission-tree, invites, workspaces, settings-general, settings-security, backup
├── dashboard
│   └── dashboard features (4): overview, my-tasks, my-subtasks, my-workspaces
├── profile
│   └── profile features (16): summary, time-tracking, last-logins, sessions, password-history, metadata, edit-profile, avatar, change-password, two-factor-auth, public-access, notifications, external-accounts, integrations, api-tokens, hourly-rate
└── workspace:123
    └── project:456
        └── project features (11): board, list, calendar, timeline, sprints, milestones, analytics, members, settings, import-export, webhooks
```

---

## GEPLAND: Fase 9 - Advanced Features

> **Doel:** Enterprise-grade features toevoegen.
>
> **⚠️ SECURITY NOTE (2026-01-08):** Alle Fase 9 items moeten de nieuwe admin access checks respecteren.
> Admin panel toegang vereist een van:
> 1. Explicit ACL op 'admin' resource met READ
> 2. Membership in "Domain Admins" group
> 3. PERMISSIONS (P) bit op een workspace (workspace admin)
> 4. System-level permissions (WRITE of PERMISSIONS op 'system')
>
> Zie `scopeService.checkPermissionFlags()` en `adminProcedure` in router.ts.

### 9.1 Audit Logging
- [ ] Log alle ACL wijzigingen
- [ ] Wie, wanneer, wat gewijzigd
- [ ] Permission change history per resource
- [ ] Audit viewer in admin panel
- [ ] **SECURITY:** Audit viewer moet scoped zijn (workspace admins zien alleen eigen workspace logs)
- [ ] **SECURITY:** Log de 4-pad admin access checks

### 9.2 LDAP/AD Sync
- [ ] Sync AD groups naar Kanbu groups
- [ ] Automatische ACL updates bij groepswijzigingen
- [ ] OU-based permission inheritance
- [ ] Scheduled sync jobs
- [ ] **⚠️ SECURITY:** AD sync mag NIET automatisch admin panel toegang geven
- [ ] **⚠️ SECURITY:** AD Domain Admins moeten correct mappen naar "Domain Admins" group OF admin ACL
- [ ] **⚠️ SECURITY:** AD workspace-level groups krijgen P bit, niet automatisch admin ACL

### 9.3 Task-Level ACL
- [ ] ACL support voor individuele tasks
- [ ] Private tasks (alleen assignee + creator)
- [ ] Task visibility inheritance van project

### 9.4 Bulk Operations
- [ ] Bulk grant/revoke voor meerdere users
- [ ] Template-based permission sets
- [ ] Copy permissions van andere resource
- [ ] **⚠️ SECURITY:** Bulk operations moeten scoped zijn (workspace admin kan alleen eigen workspace)
- [ ] **⚠️ SECURITY:** Templates mogen NIET stilletjes admin ACL toewijzen

### 9.5 Advanced UI
- [ ] Permission matrix view (users x resources)
- [ ] Effective permissions calculator
- [ ] "What-if" simulatie voor nieuwe permissies
- [ ] Import/export van ACL configuratie
- [ ] **⚠️ SECURITY:** Matrix moet ALLE 4 admin access paden tonen
- [ ] **⚠️ SECURITY:** Calculator moet `scopeService.checkPermissionFlags()` logica gebruiken
- [ ] **⚠️ SECURITY:** What-if moet waarschuwen als wijziging admin toegang geeft
- [ ] **⚠️ SECURITY:** Import moet valideren dat ACL geen security holes creëert

### 9.6 API Keys & Service Accounts
- [ ] ACL voor API keys
- [ ] Service account permissies
- [ ] Scoped tokens
- [ ] **⚠️ CRITICAL:** API key auth MOET door dezelfde `adminProcedure` checks gaan
- [ ] **⚠️ CRITICAL:** Service accounts krijgen NIET automatisch admin access

---

## Prioriteiten

### VOLTOOID - Fase 4B: Radicale Simplificatie ✅
1. **4B.1** - ✅ [+] knop voor Create Security Group in ResourceTree
2. **4B.1** - ✅ Create form in right panel (niet popup)
3. **4B.1** - ✅ Delete knop voor Security Groups
4. **4B.2** - ✅ Frontend legacy code verwijderd (GroupListPage, GroupEditPage, routes, sidebar)
5. **4B.3** - ➡️ Verplaatst naar Fase 8 (Database cleanup)

> **Note:** Backend services (groupPermissions.ts, roleAssignmentService.ts) zijn ACTIEF IN GEBRUIK als core AD-style permission services. Deze worden NIET verwijderd.

### VOLTOOID - Fase 4C: Extended Resource Hierarchy ✅
6. **4C.1** - ✅ Resource types uitbreiden (root, system, dashboard)
7. **4C.2** - ✅ ResourceTree UI uitbreiden
8. **4C.3** - ✅ Inheritance logic implementeren
9. **4C.4** - ✅ API endpoints updaten

### VOLTOOID - Fase 5: Scoped Data Access ✅
10. **5.1** - ✅ ScopeService implementeren (`services/scopeService.ts`)
11. **5.2** - ✅ Scoped user queries (admin.listUsers, admin.getUser)
12. **5.3** - ✅ Scoped group queries (group.list)
13. **5.4** - ✅ Helper methods (getUsersInScope, getGroupsInScope, etc.)

### VOLTOOID - Fase 6: Scoped Admin Panel ✅
14. **6.1** - ✅ Admin scope detection (`myAdminScope`, `useAdminScope`)
15. **6.2** - ✅ Admin sidebar filtering
16. **6.3** - ✅ ACL resource tree filtering
17. **6.4** - ✅ `acl.getResources` scope filtering

### VOLTOOID - Fase 7: Scoped UI Elements ✅
18. **7.1** - ✅ Conditionele menu's (AdminSidebar, ProjectSidebar)
19. **7.2** - ✅ AclGate component (`hooks/useAclPermission.ts`, `components/common/AclGate.tsx`)
20. **7.3** - ✅ `acl.myPermission` API endpoint

### VOLTOOID - Fase 8: Database Cleanup ✅
21. **8.1-8.5** - ✅ Legacy modellen verwijderd (WorkspaceUser, ProjectMember), code gemigreerd naar ACL

### VOLTOOID - Fase 8B: Feature ACL (Project) ✅
22. **8B.1** - ✅ Feature tabel + ACL resourceType
23. **8B.2** - ✅ ResourceTree met features onder projects
24. **8B.3** - ✅ ProjectSidebar met ACL per menu item
25. **8B.5** - ✅ Verificatie

### VOLTOOID - Fase 8C: Feature ACL (Systeem-breed) + Documentatie ✅
26. **8C.1** - ✅ Scope veld toevoegen + 40 features seeden (4 dashboard, 16 profile, 9 admin, 11 project)
27. **8C.2** - ✅ ResourceTree UI uitbreiden (Dashboard, Admin, Profile)
28. **8C.3** - ✅ Alle sidebars/layouts hooks beschikbaar
29. **8C.4** - ✅ Documentatie (CLAUDE.md, `docs/procedures/nieuwe-feature-acl.md`)
30. **8C.5** - ✅ Verificatie (TypeCheck passed, 40 features in DB)

### LATER - Fase 9: Advanced Features
31. **9.x** - Advanced features (LDAP, audit, etc.)

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

### Fase 4B Compleet ✓
- [x] [+] knop werkt in ResourceTree voor nieuwe Security Groups
- [x] Create form in right panel (niet popup)
- [x] Delete knop voor Security Groups
- [x] GroupListPage en GroupEditPage verwijderd
- [x] Sidebar link naar /admin/groups verwijderd
- [x] Routes /admin/groups verwijderd
- [x] AclPage is single source of truth voor group + ACL management

**Verplaatst naar Fase 8 (Database Cleanup):**
- [ ] WorkspaceUser model verwijderd
- [ ] ProjectMember model verwijderd
- [ ] ~~groupPermissions.ts verwijderd~~ - BEHOUDEN (actief in gebruik)
- [ ] ~~roleAssignmentService.ts verwijderd~~ - BEHOUDEN (actief in gebruik)

### Fase 4C Compleet ✅
- [x] Resource types uitgebreid: root, system, dashboard
- [x] ResourceTree toont volledige hiërarchie (Root → System/Dashboard/Workspaces)
- [x] ACL kan gezet worden op Root niveau
- [x] ACL kan gezet worden op System container
- [x] ACL kan gezet worden op Dashboard container
- [x] Inheritance werkt van root naar beneden
- [x] Domain Admins op root → volledige toegang overal
- [x] Bestaande workspace/project ACL blijft werken

### Fase 5 Compleet ✓
- [x] ScopeService geïmplementeerd (`services/scopeService.ts`)
- [x] Admin user queries scoped (listUsers, getUser)
- [x] Group queries scoped (list)
- [x] Helper methods geïmplementeerd (getUsersInScope, getGroupsInScope, etc.)

### Fase 6 Compleet ✓
- [x] Workspace admin ziet gefilterd admin panel
- [x] ACL Manager scoped per user
- [x] Admin sidebar gefilterd op scope level
- [x] `acl.getResources` filtert op scope

### Fase 7 Compleet ✓
- [x] Alle menu's dynamisch per scope (AdminSidebar, ProjectSidebar)
- [x] AclGate component voor conditional rendering
- [x] useAclPermission hook met convenience flags
- [x] acl.myPermission API endpoint
- [x] Common components geëxporteerd (AclGate, CanDo)

### Fase 8 Compleet ✓
- [x] Legacy tabellen verwijderd (WorkspaceUser, ProjectMember)
- [x] Database migratie succesvol
- [x] Geen regressies
- [x] Alle code gemigreerd naar ACL-based queries
- [x] TypeCheck passing

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
| 2026-01-08 | **Fase 8 VOLTOOID**: Database Cleanup - WorkspaceUser en ProjectMember modellen verwijderd. Alle code gemigreerd naar ACL-based queries (10+ bestanden). Legacy test files verwijderd. |
| 2026-01-08 | **SECURITY FIX**: Admin panel access vulnerability gefixt - `canAccessAdminPanel` vereist nu explicit admin permissions ipv alleen workspace READ. Gefixt in `scopeService.ts` en `adminProcedure` in `router.ts`. Fase 9 security notes toegevoegd. |
| 2026-01-08 | **Fase 8C UPDATE**: Features gesynchroniseerd met sidebars - nu 40 features (was 24). Dashboard: 4, Profile: 16, Admin: 9, Project: 11 |
| 2026-01-08 | **Fase 8C VOLTOOID**: Systeem-breed Feature ACL (40 features) + Documentatie (CLAUDE.md, procedures) |
| 2026-01-08 | **Fase 8B VOLTOOID**: Feature ACL voor Projects - Feature tabel, ResourceTree, ProjectSidebar ACL |
| 2026-01-08 | **Fase 7 VOLTOOID**: Scoped UI Elements - AclGate component, useAclPermission hook, acl.myPermission endpoint |
| 2026-01-08 | **Fase 6 VOLTOOID**: Scoped Admin Panel - useAdminScope hook, AdminSidebar filtering, ACL resource tree scope filtering |
| 2026-01-08 | **Fase 5 VOLTOOID**: Scoped Data Access - ScopeService, scoped user/group queries, helper methods |
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
