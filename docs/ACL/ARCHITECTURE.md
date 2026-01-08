# ACL Architectuur - Scoped Permission Model

## Overzicht

Dit document beschrijft de architectuur voor het **Scoped Permission Model** van Kanbu.
Het systeem is geïnspireerd op Active Directory en biedt enterprise-grade toegangscontrole
met workspace-level isolatie en gedelegeerde administratie.

**Document versie:** 1.0.0
**Datum:** 2026-01-08
**Status:** Goedgekeurd voor implementatie

---

## 1. Kernconcepten

### 1.1 Scheiding van Concerns

Het systeem maakt een duidelijke scheiding tussen:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         ACL SYSTEEM                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   RESOURCES (WAT)              PRINCIPALS (WIE)                     │
│   ─────────────────           ──────────────────                    │
│   De objecten die je          De entiteiten die                     │
│   wilt beveiligen:            rechten krijgen:                      │
│                                                                      │
│   • System (admin functies)   • Users (individuele gebruikers)      │
│   • Workspaces                • Security Groups (groepen users)     │
│   • Projects                                                         │
│   • (Future: Tasks, Wiki)                                           │
│                                                                      │
│                    ACL ENTRIES (HOE)                                │
│                    ─────────────────                                │
│                    De koppeling tussen                              │
│                    resources en principals                          │
│                    met specifieke permissies                        │
│                    (RWXDP bitmask)                                  │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Active Directory Compatibiliteit

Het model volgt AD-concepten voor enterprise compatibility:

| AD Concept | Kanbu Equivalent | Beschrijving |
|------------|------------------|--------------|
| Domain | Kanbu Instance | De root van het systeem |
| Organizational Unit (OU) | Workspace | Container voor projecten en users |
| Security Group | Group | Groep users die samen rechten krijgen |
| User Account | User | Individuele gebruiker |
| ACL | AclEntry | Permissie koppeling |
| Inheritance | inheritToChildren | Rechten erven naar children |

---

## 2. Resource Hiërarchie

### 2.1 Volledige Resource Tree (Fase 4C)

```
Kanbu (Root)                    ← resourceType: 'root', ACL hier = alles
│
├── System                      ← resourceType: 'system', systeembeheer
│   ├── User Management         ← system sub-item (future)
│   ├── Group Management        ← system sub-item (future)
│   ├── LDAP Integration        ← system sub-item (future)
│   └── Settings                ← system sub-item (future)
│
├── Dashboard                   ← resourceType: 'dashboard' (Fase 4C)
│   └── (dashboard features)    ← dashboard sub-items (future)
│
└── Workspaces                  ← resourceType: 'workspace', resourceId: null
    │
    ├── Workspace: "Kanbu-Playground"  ← resourceType: 'workspace', resourceId: {id}
    │   │
    │   └── Projects
    │       ├── Project: "LearnKanbo"  ← resourceType: 'project', resourceId: {id}
    │       │   ├── Tasks              ← (future: task-level ACL)
    │       │   └── Wiki               ← (future)
    │       │
    │       └── Project: "ACL-Test"
    │           └── ...
    │
    └── Workspace: "Production"
        └── ...
```

### 2.2 Resource Types

| Type | resourceType | resourceId | Scope | Status |
|------|--------------|------------|-------|--------|
| **Root (Kanbu)** | `root` | `null` | Alles - top-level container | Fase 4C |
| **System** | `system` | `null` | Systeembeheer (users, groups, settings) | Bestaand |
| **Dashboard** | `dashboard` | `null` | Dashboard features | Fase 4C |
| All Workspaces | `workspace` | `null` | Alle workspaces (container) | Bestaand |
| Specific Workspace | `workspace` | `{id}` | Eén workspace + children | Bestaand |
| All Projects | `project` | `null` | Alle projects | Bestaand |
| Specific Project | `project` | `{id}` | Eén project + children | Bestaand |

### 2.3 Inheritance Hiërarchie

```
root (Kanbu)                    ← ACL hier erft naar ALLES
├── system                      ← Erft van root, geeft door aan system sub-items
├── dashboard                   ← Erft van root, geeft door aan dashboard items
└── workspace (null = all)      ← Erft van root
    └── workspace:{id}          ← Erft van workspace:null
        └── project:{id}        ← Erft van workspace:{id}
```

**Voorbeeld:** Domain Admins op `root` met `inheritToChildren=true` → volledige toegang overal.

---

## 3. Scope Levels

### 3.1 Permission Scopes

Het systeem heeft drie primaire scope levels:

```
┌─────────────────────────────────────────────────────────────────────┐
│ LEVEL 1: GLOBAL/SYSTEM SCOPE                                        │
│ ─────────────────────────────                                       │
│ • Super Admins (AppRole.ADMIN of admin ACL)                        │
│ • Zien ALLES in het systeem                                        │
│ • Kunnen ALLES beheren                                             │
│ • Volledige user/group management                                  │
│ • System settings toegang                                          │
├─────────────────────────────────────────────────────────────────────┤
│ LEVEL 2: WORKSPACE SCOPE                                            │
│ ─────────────────────────                                           │
│ • Workspace Admins (P permission op workspace)                     │
│ • Zien ALLEEN hun workspace(s)                                     │
│ • Beheren workspace settings, members, projects                    │
│ • Contact list gefilterd op workspace members                      │
│ • Admin panel toont alleen workspace-scoped functies               │
├─────────────────────────────────────────────────────────────────────┤
│ LEVEL 3: PROJECT SCOPE                                              │
│ ─────────────────────────                                           │
│ • Project Managers/Members                                         │
│ • Werken binnen één of meer projects                               │
│ • Rechten bepaald door project ACL of workspace inheritance        │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Scope Cascading

Rechten werken van boven naar beneden:

```
System Admin (P op admin)
    │
    ├── Ziet alle workspaces
    ├── Ziet alle users
    ├── Ziet alle groups
    └── Volledige admin panel

Workspace Admin (P op workspace:1)
    │
    ├── Ziet ALLEEN workspace:1
    ├── Ziet ALLEEN users in workspace:1
    ├── Beheert ALLEEN projects in workspace:1
    └── Admin panel: alleen workspace:1 functies

Project Member (RWX op project:5)
    │
    ├── Werkt in project:5
    └── Geen admin toegang
```

---

## 4. Security Groups

### 4.1 Voorgestelde Standaard Groups

| Group Name | Beschrijving | Typische ACL |
|------------|--------------|--------------|
| `domain-admins` | Systeem beheerders | P op `admin:null` |
| `system-admins` | Technisch beheer | RWX op `admin:null` |
| `workspace-admins` | Workspace beheerders | P op specifieke workspaces |
| `project-managers` | Project leiders | RWXD op specifieke projects |
| `users` | Alle gebruikers (automatisch lid) | RWX op hun projects |
| `viewers` | Alleen-lezen | R op specifieke resources |
| `external-contractors` | Externe partijen | Beperkte R/RW op specifieke projects |
| `guests` | Gasten | Minimale R toegang |

### 4.2 Group Hiërarchie

```
Groups
├── System Groups (global scope)
│   ├── domain-admins
│   └── system-admins
│
├── Workspace Groups (per workspace)
│   ├── ws-{slug}-admins
│   ├── ws-{slug}-members
│   └── ws-{slug}-viewers
│
└── Project Groups (per project)
    ├── proj-{identifier}-managers
    └── proj-{identifier}-members
```

---

## 5. Scoped Data Access

### 5.1 Principe: "Zie alleen wat je mag zien"

**KRITISCH:** Alle data queries moeten gefilterd worden op basis van de user's scope.

```typescript
// FOUT - Toont alle users
const users = await prisma.user.findMany()

// GOED - Toont alleen users in scope
const users = await getUsersInScope(currentUserId)
```

### 5.2 Scope Filter Implementatie

Voor elke data query moet het systeem:

1. **Bepaal user's scope** - System, Workspace, of Project level
2. **Filter resources** - Alleen resources binnen scope
3. **Filter principals** - Alleen users/groups binnen scope

```typescript
// Voorbeeld: Contact List
async function getContactList(userId: number) {
  const scope = await getUserScope(userId)

  if (scope.level === 'system') {
    // System admin: alle users
    return prisma.user.findMany()
  }

  if (scope.level === 'workspace') {
    // Workspace admin: alleen workspace members
    return getUsersInWorkspaces(scope.workspaceIds)
  }

  // Project member: alleen project team members
  return getUsersInProjects(scope.projectIds)
}
```

### 5.3 Scope-Affected Queries

| Query | System Scope | Workspace Scope | Project Scope |
|-------|--------------|-----------------|---------------|
| Users list | Alle users | Workspace members | Project team |
| Groups list | Alle groups | Workspace groups | Project groups |
| Workspaces | Alle | Eigen workspace(s) | - |
| Projects | Alle | Workspace projects | Eigen project(s) |
| Tasks | Alle | Workspace tasks | Project tasks |
| Admin panel | Volledig | Workspace admin | - |
| Menu items | Alle | Gefilterd | Gefilterd |

---

## 6. UI Scoping

### 6.1 Conditionele Menu's

Menu items worden getoond op basis van effectieve permissies:

```typescript
// Sidebar menu items
const menuItems = [
  // Altijd zichtbaar voor ingelogde users
  { label: 'Dashboard', visible: true },
  { label: 'My Tasks', visible: true },

  // Workspace-level items
  { label: 'Projects', visible: hasWorkspaceAccess },
  { label: 'Members', visible: hasWorkspaceAdmin },

  // System-level items
  { label: 'Administration', visible: hasAdminAccess },
  { label: 'All Users', visible: hasSystemScope },
  { label: 'All Groups', visible: hasSystemScope },
]
```

### 6.2 Admin Panel Scoping

Het admin panel toont verschillende secties per scope:

**System Admin ziet:**
- All Workspaces
- All Users
- All Groups
- System Settings
- ACL Manager (volledig)
- Audit Logs

**Workspace Admin ziet:**
- Workspace Settings (eigen)
- Workspace Members (eigen)
- Workspace Projects (eigen)
- ACL Manager (workspace scope)

---

## 7. Implementatie Fases

### Fase 1-3B: Foundation & Pure ACL (VOLTOOID)
- [x] AclEntry model
- [x] AclService core functies
- [x] tRPC procedures
- [x] Basic UI
- [x] Legacy fallback verwijderd
- [x] Workspace/Project access via ACL
- [x] Members via ACL

### Fase 4: Resource Tree UI (VOLTOOID)
- [x] VSCode-style tree component
- [x] Volledige hiërarchie tonen
- [x] Security Groups sectie
- [x] Real-time WebSocket updates

### Fase 4B: Radicale Simplificatie (VOLTOOID)
- [x] [+] knop voor Create Security Group in ResourceTree
- [x] Create form in right panel (niet popup)
- [x] Delete knop voor Security Groups
- [x] GroupListPage en GroupEditPage verwijderd
- [x] AclPage is single source of truth

### Fase 4C: Extended Resource Hierarchy (VOLTOOID)
- [x] Resource types: root, system, dashboard
- [x] ResourceTree met volledige AD-style hiërarchie
- [x] ACL op Root niveau (Domain Admins met inherit)
- [x] ACL op System container
- [x] ACL op Dashboard container
- [x] Inheritance van root naar alle children

### Fase 5: Scoped Data Access (VOLTOOID)
- [x] getUserScope() service method
- [x] Scope-filtered queries voor alle data
- [x] Contact list scoping
- [x] User/Group list scoping

### Fase 6: Scoped Admin Panel (VOLTOOID)
- [x] Workspace Admin view
- [x] Gefilterde admin functies
- [x] Scoped ACL Manager

### Fase 7: Scoped UI Elements (VOLTOOID)
- [x] Conditionele menu's
- [x] Scoped breadcrumbs
- [x] Permission-based component rendering

### Fase 8B: Feature ACL Project (VOLTOOID)
- [x] Feature tabel + ACL resourceType 'feature'
- [x] 11 project features geseed
- [x] ProjectSidebar met ACL per menu item

### Fase 8C: Feature ACL Systeem-breed (VOLTOOID)
- [x] 40 features geseed (4 dashboard, 16 profile, 9 admin, 11 project)
- [x] useFeatureAccess hook met convenience hooks
- [x] ResourceTree toont features per scope
- [x] Documentatie bijgewerkt

### Fase 8-9: Advanced Features (PLANNED)
- [ ] Database cleanup (legacy tabellen verwijderen)
- [ ] Audit logging
- [ ] LDAP/AD Sync
- [ ] Task-level ACL
- [ ] API Keys met scoped access

---

## 8. Technische Specificaties

### 8.1 Core Services

| Service | Verantwoordelijkheid |
|---------|---------------------|
| `AclService` | ACL CRUD, permission checks |
| `PermissionService` | High-level access checks, role mapping |
| `ScopeService` (nieuw) | Bepaal user scope, filter queries |

### 8.2 ScopeService API (te implementeren)

```typescript
interface UserScope {
  level: 'system' | 'workspace' | 'project'
  workspaceIds: number[]  // Workspaces waar user toegang heeft
  projectIds: number[]    // Projects waar user toegang heeft
  permissions: {
    canManageUsers: boolean
    canManageGroups: boolean
    canManageWorkspaces: boolean
    canAccessAdminPanel: boolean
  }
}

class ScopeService {
  // Bepaal user's effectieve scope
  async getUserScope(userId: number): Promise<UserScope>

  // Gefilterde queries
  async getUsersInScope(userId: number): Promise<User[]>
  async getGroupsInScope(userId: number): Promise<Group[]>
  async getWorkspacesInScope(userId: number): Promise<Workspace[]>
  async getProjectsInScope(userId: number, workspaceId?: number): Promise<Project[]>

  // Scope checks
  async canSeeUser(viewerId: number, targetUserId: number): Promise<boolean>
  async canManageResource(userId: number, resourceType: string, resourceId: number): Promise<boolean>
}
```

### 8.3 Database Queries Pattern

Alle queries die data ophalen moeten dit pattern volgen:

```typescript
// 1. Haal user scope op (cached)
const scope = await scopeService.getUserScope(ctx.user.id)

// 2. Bouw query filter op basis van scope
const whereClause = buildScopeFilter(scope, 'workspace')

// 3. Execute query met filter
const data = await prisma.workspace.findMany({
  where: whereClause,
  ...otherOptions
})
```

---

## 9. Migratie Strategie

### 9.1 Backward Compatibility

Tijdens de migratie moet het systeem blijven werken:

1. **Bestaande users behouden toegang** via huidige ACL entries
2. **Nieuwe scope checks** worden geleidelijk toegevoegd
3. **Feature flags** voor nieuwe scoped functies
4. **Fallback naar onscoped** als scope niet bepaald kan worden

### 9.2 Stapsgewijze Rollout

```
Week 1-2: ScopeService implementeren
    └── Unit tests voor scope determination

Week 3-4: Contact list scoping
    └── Eerste zichtbare scoped feature

Week 5-6: Admin panel scoping
    └── Workspace admin view

Week 7-8: Menu scoping
    └── Conditionele UI elements

Week 9+: Advanced features
    └── Audit, LDAP sync, etc.
```

---

## 10. Success Criteria

### 10.1 Functionele Eisen

- [ ] Workspace Admin kan ALLEEN eigen workspace beheren
- [ ] Contact list toont ALLEEN users in scope
- [ ] Admin panel gefilterd per scope
- [ ] Menu items verborgen als geen toegang
- [ ] Geen data leakage tussen workspaces

### 10.2 Niet-Functionele Eisen

- [ ] Scope check < 50ms per request
- [ ] Geen breaking changes voor bestaande users
- [ ] Audit trail voor alle scope-gerelateerde acties
- [ ] AD-compatible group structuur

---

## 11. Referenties

- [README.md](./README.md) - ACL systeem basis documentatie
- [ROADMAP.md](./ROADMAP.md) - Implementatie roadmap
- [MIGRATION.md](./MIGRATION.md) - Migratie handleiding
- Active Directory Security Model: https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/

---

## Changelog

| Versie | Datum | Wijziging |
|--------|-------|-----------|
| 2.0.0 | 2026-01-08 | Fase 4B-8C VOLTOOID: Systeem-breed Feature ACL (40 features) |
| 1.2.0 | 2026-01-08 | Fase 4C: Extended Resource Hierarchy (Root, System, Dashboard) |
| 1.1.1 | 2026-01-08 | Fase 4B.1 voltooid: Security Groups CRUD in AclPage |
| 1.1.0 | 2026-01-08 | Fase 4B: Radicale Simplificatie (AclPage single source of truth) |
| 1.0.0 | 2026-01-08 | Initiële architectuur document |
